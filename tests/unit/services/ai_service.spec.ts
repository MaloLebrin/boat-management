import { test } from '@japa/runner'
import { AiProviderTimeoutError } from '#exceptions/ai_errors'
import {
  AI_ANALYSIS_TIMEOUT_MS,
  AI_CHAT_TIMEOUT_MS,
  AI_SDK_MAX_RETRIES,
} from '#shared/constants/ai'
import {
  parseFunctionDialectToolCalls,
  parseGoogleToolCalls,
  parseToolArguments,
  runWithTimeout,
  sdkClientOptions,
  toAnthropicPayload,
  toAnthropicTools,
  toFunctionDialectTools,
  toGoogleContents,
  toGoogleTools,
  toMistralMessages,
  toOpenAiMessages,
  type AiChatMessage,
} from '#services/ai_service'
import type { AiToolDefinition } from '#shared/types/ai'

const TOOLS: AiToolDefinition[] = [
  {
    name: 'list_boats',
    description: 'Liste les bateaux de la flotte',
    parameters: { type: 'object', properties: { search: { type: 'string' } } },
  },
]

const TOOL_THREAD: AiChatMessage[] = [
  { role: 'system', content: 'Vous êtes le copilote.' },
  { role: 'user', content: 'Combien de bateaux ?' },
  {
    role: 'assistant',
    content: '',
    toolCalls: [{ id: 'call_1', name: 'list_boats', arguments: { search: 'sun' } }],
  },
  { role: 'tool', content: '{"total":2}', toolCallId: 'call_1' },
]

test.group('AiService — parseToolArguments', () => {
  test('parse une string JSON et garde un objet tel quel', ({ assert }) => {
    assert.deepEqual(parseToolArguments('{"boatId":22}'), { boatId: 22 })
    assert.deepEqual(parseToolArguments({ boatId: 22 }), { boatId: 22 })
  })

  test('dégrade en objet vide sur un JSON invalide, un tableau ou null', ({ assert }) => {
    assert.deepEqual(parseToolArguments('pas du json'), {})
    assert.deepEqual(parseToolArguments('[1,2]'), {})
    assert.deepEqual(parseToolArguments(null), {})
    assert.deepEqual(parseToolArguments(undefined), {})
  })
})

test.group('AiService — dialecte function (Mistral / OpenAI)', () => {
  test('traduit les définitions en tools de type function', ({ assert }) => {
    const tools = toFunctionDialectTools(TOOLS)
    assert.deepEqual(tools, [
      {
        type: 'function',
        function: {
          name: 'list_boats',
          description: 'Liste les bateaux de la flotte',
          parameters: { type: 'object', properties: { search: { type: 'string' } } },
        },
      },
    ])
  })

  test('Mistral : toolCalls assistant sérialisés, résultat en rôle tool + toolCallId', ({
    assert,
  }) => {
    const messages = toMistralMessages(TOOL_THREAD)
    assert.deepEqual(messages[0], { role: 'system', content: 'Vous êtes le copilote.' })
    assert.deepEqual(messages[2], {
      role: 'assistant',
      content: '',
      toolCalls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'list_boats', arguments: '{"search":"sun"}' },
        },
      ],
    })
    assert.deepEqual(messages[3], { role: 'tool', content: '{"total":2}', toolCallId: 'call_1' })
  })

  test('OpenAI : mêmes messages en snake_case tool_calls / tool_call_id', ({ assert }) => {
    const messages = toOpenAiMessages(TOOL_THREAD)
    assert.deepEqual(messages[2], {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'list_boats', arguments: '{"search":"sun"}' },
        },
      ],
    })
    assert.deepEqual(messages[3], { role: 'tool', content: '{"total":2}', tool_call_id: 'call_1' })
  })

  test('un message assistant sans appel reste un message simple', ({ assert }) => {
    const messages = toMistralMessages([{ role: 'assistant', content: 'Bonjour' }])
    assert.deepEqual(messages, [{ role: 'assistant', content: 'Bonjour' }])
  })

  test('parse les tool_calls avec arguments string ou objet, id manquant → synthétique', ({
    assert,
  }) => {
    const calls = parseFunctionDialectToolCalls([
      { id: 'a', function: { name: 'list_boats', arguments: '{"search":"sun"}' } },
      { id: null, function: { name: 'get_boat', arguments: { boatId: 3 } } },
    ])
    assert.deepEqual(calls, [
      { id: 'a', name: 'list_boats', arguments: { search: 'sun' } },
      { id: 'call_1', name: 'get_boat', arguments: { boatId: 3 } },
    ])
    assert.deepEqual(parseFunctionDialectToolCalls(undefined), [])
    assert.deepEqual(parseFunctionDialectToolCalls(null), [])
  })
})

test.group('AiService — Anthropic', () => {
  test('traduit les définitions en tools avec input_schema', ({ assert }) => {
    assert.deepEqual(toAnthropicTools(TOOLS), [
      {
        name: 'list_boats',
        description: 'Liste les bateaux de la flotte',
        input_schema: { type: 'object', properties: { search: { type: 'string' } } },
      },
    ])
  })

  test('système extrait à part, tool_use assistant, tool_result dans un message user', ({
    assert,
  }) => {
    const { system, messages } = toAnthropicPayload(TOOL_THREAD)
    assert.equal(system, 'Vous êtes le copilote.')
    assert.deepEqual(messages, [
      { role: 'user', content: 'Combien de bateaux ?' },
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'call_1', name: 'list_boats', input: { search: 'sun' } }],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'call_1', content: '{"total":2}' }],
      },
    ])
  })

  test('regroupe des résultats consécutifs dans le même message user', ({ assert }) => {
    const { messages } = toAnthropicPayload([
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'a', name: 'list_boats', arguments: {} },
          { id: 'b', name: 'fleet_overview', arguments: {} },
        ],
      },
      { role: 'tool', content: 'r1', toolCallId: 'a' },
      { role: 'tool', content: 'r2', toolCallId: 'b' },
    ])
    assert.lengthOf(messages, 2)
    const results = messages[1]
    assert.equal(results.role, 'user')
    assert.lengthOf(results.content as unknown[], 2)
  })

  test('un contenu texte accompagnant des appels devient un bloc text', ({ assert }) => {
    const { messages } = toAnthropicPayload([
      {
        role: 'assistant',
        content: 'Je regarde.',
        toolCalls: [{ id: 'a', name: 'list_boats', arguments: {} }],
      },
    ])
    assert.deepEqual(messages[0].content, [
      { type: 'text', text: 'Je regarde.' },
      { type: 'tool_use', id: 'a', name: 'list_boats', input: {} },
    ])
  })
})

test.group('AiService — Google', () => {
  test('traduit les définitions en functionDeclarations', ({ assert }) => {
    assert.deepEqual(toGoogleTools(TOOLS), [
      {
        functionDeclarations: [
          {
            name: 'list_boats',
            description: 'Liste les bateaux de la flotte',
            parameters: { type: 'object', properties: { search: { type: 'string' } } },
          },
        ],
      },
    ])
  })

  test('functionCall côté model, functionResponse nommée via le toolCallId', ({ assert }) => {
    const { system, contents } = toGoogleContents(TOOL_THREAD)
    assert.equal(system, 'Vous êtes le copilote.')
    assert.deepEqual(contents, [
      { role: 'user', parts: [{ text: 'Combien de bateaux ?' }] },
      {
        role: 'model',
        parts: [{ functionCall: { id: 'call_1', name: 'list_boats', args: { search: 'sun' } } }],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'call_1',
              name: 'list_boats',
              response: { result: '{"total":2}' },
            },
          },
        ],
      },
    ])
  })

  test('parse les functionCalls, id manquant → synthétique, sans nom → ignoré', ({ assert }) => {
    const calls = parseGoogleToolCalls([
      { name: 'list_boats', args: { search: 'sun' } },
      { id: 'x', name: 'get_boat' },
      { args: {} },
    ])
    assert.deepEqual(calls, [
      { id: 'google_call_0', name: 'list_boats', arguments: { search: 'sun' } },
      { id: 'x', name: 'get_boat', arguments: {} },
    ])
    assert.deepEqual(parseGoogleToolCalls(undefined), [])
  })
})

test.group('AiService — délai des appels fournisseur (#853)', () => {
  test('un fournisseur qui ne répond jamais lève AiProviderTimeoutError et annule le signal', async ({
    assert,
  }) => {
    let received: AbortSignal | null = null
    const started = Date.now()

    await assert.rejects(
      () =>
        runWithTimeout(50, (signal) => {
          received = signal
          return new Promise<never>(() => {})
        }),
      AiProviderTimeoutError
    )

    assert.isTrue(received!.aborted)
    assert.isBelow(Date.now() - started, 1_000)
  })

  test('le rejet du SDK sur abort devient AiProviderTimeoutError', async ({ assert }) => {
    await assert.rejects(
      () =>
        runWithTimeout(
          30,
          (signal) =>
            new Promise<never>((_, reject) => {
              signal.addEventListener('abort', () => reject(new Error('Request was aborted.')))
            })
        ),
      AiProviderTimeoutError
    )
  })

  test("une erreur du fournisseur avant l'échéance passe telle quelle", async ({ assert }) => {
    const boom = new Error('401 invalid api key')
    try {
      await runWithTimeout(1_000, async () => {
        throw boom
      })
      assert.fail('should have thrown')
    } catch (error) {
      assert.strictEqual(error, boom)
    }
  })

  test("une réponse dans le délai est rendue et le signal n'est pas annulé", async ({ assert }) => {
    let received: AbortSignal | null = null
    const result = await runWithTimeout(1_000, async (signal) => {
      received = signal
      return 'ok'
    })
    assert.equal(result, 'ok')
    assert.isFalse(received!.aborted)
  })

  test('les clients SDK sont construits avec le délai et une seule relance', ({ assert }) => {
    const options = sdkClientOptions('sk-test', AI_CHAT_TIMEOUT_MS)
    assert.deepEqual(options.mistral, { apiKey: 'sk-test', timeoutMs: 30_000 })
    assert.deepEqual(options.openai, { apiKey: 'sk-test', timeout: 30_000, maxRetries: 1 })
    assert.deepEqual(options.anthropic, { apiKey: 'sk-test', timeout: 30_000, maxRetries: 1 })
    assert.deepEqual(options.google, { apiKey: 'sk-test', httpOptions: { timeout: 30_000 } })
  })

  test("un tour de chat a moins de marge qu'une analyse", ({ assert }) => {
    assert.isBelow(AI_CHAT_TIMEOUT_MS, AI_ANALYSIS_TIMEOUT_MS)
    assert.equal(AI_SDK_MAX_RETRIES, 1)
  })
})
