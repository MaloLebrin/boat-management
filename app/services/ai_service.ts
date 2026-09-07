import { AiProviderKeyMissingError } from '#exceptions/ai_errors'
import {
  DEFAULT_AI_MODEL_BY_PROVIDER,
  modelBelongsToProvider,
  type AiChatOptions,
  type AiProvider,
  type AiToolCall,
  type AiToolDefinition,
} from '#shared/types/ai'
import env from '#start/env'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { inject } from '@adonisjs/core'
import { Mistral } from '@mistralai/mistralai'
import OpenAI from 'openai'

export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  /** Appels d'outils portés par un message `assistant` (#642). */
  toolCalls?: AiToolCall[]
  /** Identifiant de l'appel dont un message `tool` est le résultat (#642). */
  toolCallId?: string
}

export interface AiChatResult {
  content: string
  /** Toujours présent — vide quand le modèle répond sans appeler d'outil. */
  toolCalls: AiToolCall[]
  tokensUsed: number
}

/**
 * L'API Anthropic exige `max_tokens` (pas de défaut SDK). 8192 laisse une
 * marge large aux réponses JSON de l'assistant sans autoriser des sorties
 * démesurées sur la clé de l'org.
 */
const ANTHROPIC_MAX_TOKENS = 8192

/**
 * Arguments d'un appel d'outil tels que rendus par un SDK : objet chez
 * Anthropic/Google, string JSON (parfois objet) chez Mistral/OpenAI. Un JSON
 * invalide dégrade en `{}` — l'exécuteur d'outil répondra par une erreur que
 * le modèle pourra corriger au tour suivant, plutôt qu'un crash du tour.
 */
export function parseToolArguments(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // string non-JSON → arguments vides
    }
  }
  return {}
}

/* -------------------------------------------------------------------------- */
/* Mistral / OpenAI — même dialecte « function calling » (tool_calls)         */
/* -------------------------------------------------------------------------- */

interface FunctionDialectToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type FunctionDialectMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: FunctionDialectToolCall[] }
  | { role: 'tool'; content: string; toolCallId: string }

/**
 * Fil neutre → messages Mistral (camelCase). Un message assistant porteur
 * d'appels garde ses `toolCalls`, un résultat d'outil devient un rôle `tool`
 * avec son `toolCallId`.
 */
export function toMistralMessages(messages: AiChatMessage[]): FunctionDialectMessage[] {
  return messages.map((m) => {
    if (m.role === 'tool') {
      return { role: 'tool', content: m.content, toolCallId: m.toolCallId ?? '' }
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content,
        toolCalls: m.toolCalls.map((call) => ({
          id: call.id,
          type: 'function' as const,
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        })),
      }
    }
    return { role: m.role, content: m.content }
  })
}

type OpenAiWireMessage =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant'
      content: string
      tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
    }
  | { role: 'tool'; content: string; tool_call_id: string }

/** Fil neutre → messages OpenAI (snake_case `tool_calls` / `tool_call_id`). */
export function toOpenAiMessages(messages: AiChatMessage[]): OpenAiWireMessage[] {
  return messages.map((m) => {
    if (m.role === 'tool') {
      return { role: 'tool', content: m.content, tool_call_id: m.toolCallId ?? '' }
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content,
        tool_calls: m.toolCalls.map((call) => ({
          id: call.id,
          type: 'function' as const,
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        })),
      }
    }
    return { role: m.role, content: m.content }
  })
}

/** Définitions neutres → `tools` de type `function` (Mistral et OpenAI). */
export function toFunctionDialectTools(tools: AiToolDefinition[]) {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }))
}

/** `tool_calls` Mistral/OpenAI → appels neutres (arguments string ou objet). */
export function parseFunctionDialectToolCalls(
  rawCalls:
    | { id?: string | null; function: { name: string; arguments: unknown } }[]
    | null
    | undefined
): AiToolCall[] {
  if (!rawCalls) return []
  return rawCalls.map((call, index) => ({
    id: call.id ?? `call_${index}`,
    name: call.function.name,
    arguments: parseToolArguments(call.function.arguments),
  }))
}

/* -------------------------------------------------------------------------- */
/* Anthropic — blocs tool_use / tool_result                                   */
/* -------------------------------------------------------------------------- */

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }

interface AnthropicWireMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

/**
 * Fil neutre → messages Anthropic. Le système est extrait à part (paramètre
 * top-level), les appels d'outils deviennent des blocs `tool_use` du message
 * assistant et les résultats repartent en blocs `tool_result` d'un message
 * `user` — les résultats consécutifs sont regroupés dans le même message,
 * comme l'API l'exige après un tour à plusieurs appels.
 */
export function toAnthropicPayload(messages: AiChatMessage[]): {
  system: string
  messages: AnthropicWireMessage[]
} {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')

  const thread: AnthropicWireMessage[] = []
  for (const message of messages) {
    if (message.role === 'system') continue

    if (message.role === 'tool') {
      const block: AnthropicContentBlock = {
        type: 'tool_result',
        tool_use_id: message.toolCallId ?? '',
        content: message.content,
      }
      const last = thread.at(-1)
      if (last && last.role === 'user' && Array.isArray(last.content)) {
        last.content.push(block)
      } else {
        thread.push({ role: 'user', content: [block] })
      }
      continue
    }

    if (message.role === 'assistant' && message.toolCalls?.length) {
      const blocks: AnthropicContentBlock[] = []
      if (message.content) blocks.push({ type: 'text', text: message.content })
      for (const call of message.toolCalls) {
        blocks.push({ type: 'tool_use', id: call.id, name: call.name, input: call.arguments })
      }
      thread.push({ role: 'assistant', content: blocks })
      continue
    }

    thread.push({ role: message.role, content: message.content })
  }

  return { system, messages: thread }
}

/** Définitions neutres → `tools` Anthropic (`input_schema`). */
export function toAnthropicTools(tools: AiToolDefinition[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }))
}

/* -------------------------------------------------------------------------- */
/* Google — functionDeclarations / functionCall / functionResponse            */
/* -------------------------------------------------------------------------- */

interface GooglePart {
  text?: string
  functionCall?: { id?: string; name: string; args: Record<string, unknown> }
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> }
}

interface GoogleContent {
  role: 'user' | 'model'
  parts: GooglePart[]
}

/**
 * Fil neutre → `contents` Gemini. Les rôles deviennent `user` | `model`, les
 * appels d'outils des parts `functionCall` et les résultats des parts
 * `functionResponse` (regroupées dans un même tour `user`). Gemini identifie
 * un résultat par le **nom** de la fonction : le nom est retrouvé depuis les
 * appels du message assistant précédent via le `toolCallId`.
 */
export function toGoogleContents(messages: AiChatMessage[]): {
  system: string
  contents: GoogleContent[]
} {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')

  const callNamesById = new Map<string, string>()
  for (const message of messages) {
    for (const call of message.toolCalls ?? []) callNamesById.set(call.id, call.name)
  }

  const contents: GoogleContent[] = []
  for (const message of messages) {
    if (message.role === 'system') continue

    if (message.role === 'tool') {
      const part: GooglePart = {
        functionResponse: {
          id: message.toolCallId,
          name: callNamesById.get(message.toolCallId ?? '') ?? 'unknown',
          response: { result: message.content },
        },
      }
      const last = contents.at(-1)
      if (last && last.role === 'user' && last.parts.every((p) => p.functionResponse)) {
        last.parts.push(part)
      } else {
        contents.push({ role: 'user', parts: [part] })
      }
      continue
    }

    if (message.role === 'assistant' && message.toolCalls?.length) {
      const parts: GooglePart[] = []
      if (message.content) parts.push({ text: message.content })
      for (const call of message.toolCalls) {
        parts.push({ functionCall: { id: call.id, name: call.name, args: call.arguments } })
      }
      contents.push({ role: 'model', parts })
      continue
    }

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })
  }

  return { system, contents }
}

/** Définitions neutres → `functionDeclarations` Gemini. */
export function toGoogleTools(tools: AiToolDefinition[]) {
  return [
    {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    },
  ]
}

/**
 * `functionCalls` Gemini → appels neutres. Gemini omet souvent l'`id` : un
 * identifiant synthétique stable est posé pour que le résultat puisse être
 * réapparié (le nom, lui, est retrouvé via `callNamesById`).
 */
export function parseGoogleToolCalls(
  rawCalls: { id?: string; name?: string; args?: Record<string, unknown> }[] | undefined
): AiToolCall[] {
  if (!rawCalls) return []
  return rawCalls
    .filter((call) => Boolean(call.name))
    .map((call, index) => ({
      id: call.id || `google_call_${index}`,
      name: call.name as string,
      arguments: parseToolArguments(call.args),
    }))
}

/**
 * Façade unique des appels aux modèles de langage — un adaptateur par
 * fournisseur (`mistral`, `anthropic`, `openai`, `google`), même contrat de
 * sortie `{ content, toolCalls, tokensUsed }` (#642 : `toolCalls` est vide
 * quand aucun outil n'est passé ou que le modèle répond directement).
 *
 * Sans options, l'appel part chez Mistral avec la clé de l'app. Les autres
 * fournisseurs n'existent qu'en BYOK (clé d'org obligatoire) : seul le client
 * Mistral de l'app est mis en cache, les clients BYOK sont construits par
 * appel — une org avec sa propre clé consomme sur son compte, la clé de l'app
 * reste le défaut.
 */
@inject()
export default class AiService {
  #client: Mistral
  #model: string

  constructor() {
    this.#client = new Mistral({ apiKey: env.get('MISTRAL_API_KEY').release() })
    this.#model = env.get('AI_MODEL', 'mistral-small-latest')
  }

  async chat(messages: AiChatMessage[], options: AiChatOptions = {}): Promise<AiChatResult> {
    const provider = options.provider ?? 'mistral'
    const model = this.#resolveModel(provider, options.model ?? null)
    const apiKey = options.apiKey ?? null
    const tools = options.tools ?? []

    if (provider === 'mistral') return this.#chatMistral(messages, model, apiKey, tools)

    // Défensif : les appelants (assistant) garantissent la clé pour un
    // fournisseur BYOK — il n'y a pas de clé d'app hors Mistral.
    if (!apiKey) throw new AiProviderKeyMissingError(provider)

    if (provider === 'anthropic') return this.#chatAnthropic(messages, model, apiKey, tools)
    if (provider === 'openai') return this.#chatOpenAi(messages, model, apiKey, tools)
    return this.#chatGoogle(messages, model, apiKey, tools)
  }

  /**
   * Un `aiModelOverride` étranger au fournisseur de l'appel est ignoré
   * (fallback sur le défaut du fournisseur) : l'org peut avoir configuré un
   * modèle Claude pour son assistant alors que les autres features IA
   * continuent d'appeler Mistral avec la clé de l'app.
   */
  #resolveModel(provider: AiProvider, model: string | null): string {
    if (model && modelBelongsToProvider(model, provider)) return model
    return provider === 'mistral' ? this.#model : DEFAULT_AI_MODEL_BY_PROVIDER[provider]
  }

  async #chatMistral(
    messages: AiChatMessage[],
    model: string,
    apiKey: string | null,
    tools: AiToolDefinition[]
  ): Promise<AiChatResult> {
    // BYOK : une org avec sa propre clé Mistral consomme sur son compte —
    // client dédié pour l'appel, la clé de l'app reste le défaut.
    const client = apiKey ? new Mistral({ apiKey }) : this.#client
    const response = await client.chat.complete({
      model,
      messages: toMistralMessages(messages) as Parameters<
        typeof client.chat.complete
      >[0]['messages'],
      ...(tools.length ? { tools: toFunctionDialectTools(tools) } : {}),
    })

    const tokensUsed = response.usage?.totalTokens ?? 0
    const message = response.choices?.[0]?.message
    const toolCalls = parseFunctionDialectToolCalls(
      message?.toolCalls as Parameters<typeof parseFunctionDialectToolCalls>[0]
    )

    const raw = message?.content
    if (!raw) return { content: '', toolCalls, tokensUsed }

    const content =
      typeof raw === 'string'
        ? raw
        : raw
            .filter((chunk) => chunk.type === 'text')
            .map((chunk) => chunk.text)
            .join('')

    return { content, toolCalls, tokensUsed }
  }

  async #chatAnthropic(
    messages: AiChatMessage[],
    model: string,
    apiKey: string,
    tools: AiToolDefinition[]
  ): Promise<AiChatResult> {
    const client = new Anthropic({ apiKey })

    // Anthropic : le prompt système est un paramètre top-level, pas un message.
    const { system, messages: thread } = toAnthropicPayload(messages)

    const response = await client.messages.create({
      model,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: system || undefined,
      messages: thread as Anthropic.MessageParam[],
      ...(tools.length ? { tools: toAnthropicTools(tools) as Anthropic.Tool[] } : {}),
    })

    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    const toolCalls: AiToolCall[] = response.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      .map((block) => ({
        id: block.id,
        name: block.name,
        arguments: parseToolArguments(block.input),
      }))

    return {
      content,
      toolCalls,
      tokensUsed: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
    }
  }

  async #chatOpenAi(
    messages: AiChatMessage[],
    model: string,
    apiKey: string,
    tools: AiToolDefinition[]
  ): Promise<AiChatResult> {
    const client = new OpenAI({ apiKey })

    // Le shape system/user/assistant passe tel quel en chat.completions.
    const response = await client.chat.completions.create({
      model,
      messages: toOpenAiMessages(messages) as OpenAI.ChatCompletionMessageParam[],
      ...(tools.length
        ? { tools: toFunctionDialectTools(tools) as OpenAI.ChatCompletionTool[] }
        : {}),
    })

    const message = response.choices[0]?.message

    return {
      content: message?.content ?? '',
      toolCalls: parseFunctionDialectToolCalls(
        message?.tool_calls?.filter(
          (call): call is OpenAI.ChatCompletionMessageToolCall & { type: 'function' } =>
            call.type === 'function'
        )
      ),
      tokensUsed: response.usage?.total_tokens ?? 0,
    }
  }

  async #chatGoogle(
    messages: AiChatMessage[],
    model: string,
    apiKey: string,
    tools: AiToolDefinition[]
  ): Promise<AiChatResult> {
    const client = new GoogleGenAI({ apiKey })

    // Gemini : rôles `user` | `model`, prompt système via `systemInstruction`.
    const { system, contents } = toGoogleContents(messages)

    const config: Record<string, unknown> = {}
    if (system) config.systemInstruction = system
    if (tools.length) config.tools = toGoogleTools(tools)

    const response = await client.models.generateContent({
      model,
      contents: contents as Parameters<typeof client.models.generateContent>[0]['contents'],
      config: Object.keys(config).length ? config : undefined,
    })

    return {
      content: response.text ?? '',
      toolCalls: parseGoogleToolCalls(
        response.functionCalls as Parameters<typeof parseGoogleToolCalls>[0]
      ),
      tokensUsed: response.usageMetadata?.totalTokenCount ?? 0,
    }
  }
}
