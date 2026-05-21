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

  async chat(messages: AiChatMessage[]) {
    const response = await this.#client.chat.complete({
      model: this.#model,
      messages,
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) return ''

    if (typeof content === 'string') return content

    return content
      .filter((chunk) => chunk.type === 'text')
      .map((chunk) => chunk.text)
      .join('')
  }
}
