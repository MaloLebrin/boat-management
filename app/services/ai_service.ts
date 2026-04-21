import { env } from '#start/env'
import { Mistral } from '@mistralai/mistralai'

export class AIService {
  private readonly model: string
  private readonly client: Mistral

  constructor() {
    this.client = new Mistral({ apiKey: env.MISTRAL_API_KEY })
  }
}
