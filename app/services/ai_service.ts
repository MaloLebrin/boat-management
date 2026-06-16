import { inject } from '@adonisjs/core'
import env from '#start/env'
import { Mistral } from '@mistralai/mistralai'

export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

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
    modelOverride?: string | null
  ): Promise<{ content: string; tokensUsed: number }> {
    const model = modelOverride ?? this.#model
    const response = await this.#client.chat.complete({
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
}
