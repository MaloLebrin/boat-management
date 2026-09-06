import { AiProviderKeyMissingError } from '#exceptions/ai_errors'
import {
  DEFAULT_AI_MODEL_BY_PROVIDER,
  modelBelongsToProvider,
  type AiChatOptions,
  type AiProvider,
} from '#shared/types/ai'
import env from '#start/env'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { inject } from '@adonisjs/core'
import { Mistral } from '@mistralai/mistralai'
import OpenAI from 'openai'

export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * L'API Anthropic exige `max_tokens` (pas de défaut SDK). 8192 laisse une
 * marge large aux réponses JSON de l'assistant sans autoriser des sorties
 * démesurées sur la clé de l'org.
 */
const ANTHROPIC_MAX_TOKENS = 8192

/**
 * Façade unique des appels aux modèles de langage — un adaptateur par
 * fournisseur (`mistral`, `anthropic`, `openai`, `google`), même contrat de
 * sortie `{ content, tokensUsed }`.
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

  async chat(
    messages: AiChatMessage[],
    options: AiChatOptions = {}
  ): Promise<{ content: string; tokensUsed: number }> {
    const provider = options.provider ?? 'mistral'
    const model = this.#resolveModel(provider, options.model ?? null)
    const apiKey = options.apiKey ?? null

    if (provider === 'mistral') return this.#chatMistral(messages, model, apiKey)

    // Défensif : les appelants (assistant) garantissent la clé pour un
    // fournisseur BYOK — il n'y a pas de clé d'app hors Mistral.
    if (!apiKey) throw new AiProviderKeyMissingError(provider)

    if (provider === 'anthropic') return this.#chatAnthropic(messages, model, apiKey)
    if (provider === 'openai') return this.#chatOpenAi(messages, model, apiKey)
    return this.#chatGoogle(messages, model, apiKey)
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
    apiKey: string | null
  ): Promise<{ content: string; tokensUsed: number }> {
    // BYOK : une org avec sa propre clé Mistral consomme sur son compte —
    // client dédié pour l'appel, la clé de l'app reste le défaut.
    const client = apiKey ? new Mistral({ apiKey }) : this.#client
    const response = await client.chat.complete({
      model,
      messages,
    })

    const tokensUsed = response.usage?.totalTokens ?? 0

    const raw = response.choices?.[0]?.message?.content
    if (!raw) return { content: '', tokensUsed }

    const content =
      typeof raw === 'string'
        ? raw
        : raw
            .filter((chunk) => chunk.type === 'text')
            .map((chunk) => chunk.text)
            .join('')

    return { content, tokensUsed }
  }

  async #chatAnthropic(
    messages: AiChatMessage[],
    model: string,
    apiKey: string
  ): Promise<{ content: string; tokensUsed: number }> {
    const client = new Anthropic({ apiKey })

    // Anthropic : le prompt système est un paramètre top-level, pas un message.
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const thread = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const response = await client.messages.create({
      model,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: system || undefined,
      messages: thread,
    })

    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return {
      content,
      tokensUsed: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
    }
  }

  async #chatOpenAi(
    messages: AiChatMessage[],
    model: string,
    apiKey: string
  ): Promise<{ content: string; tokensUsed: number }> {
    const client = new OpenAI({ apiKey })

    // Le shape system/user/assistant passe tel quel en chat.completions.
    const response = await client.chat.completions.create({ model, messages })

    return {
      content: response.choices[0]?.message?.content ?? '',
      tokensUsed: response.usage?.total_tokens ?? 0,
    }
  }

  async #chatGoogle(
    messages: AiChatMessage[],
    model: string,
    apiKey: string
  ): Promise<{ content: string; tokensUsed: number }> {
    const client = new GoogleGenAI({ apiKey })

    // Gemini : rôles `user` | `model`, prompt système via `systemInstruction`.
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      }))

    const response = await client.models.generateContent({
      model,
      contents,
      config: system ? { systemInstruction: system } : undefined,
    })

    return {
      content: response.text ?? '',
      tokensUsed: response.usageMetadata?.totalTokenCount ?? 0,
    }
  }
}
