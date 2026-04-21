import AiQueueService from '#services/ai_queue_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class AiController {
  async chat({ request, response, auth }: HttpContext) {
    await auth.authenticate()

    const messages = request.input('messages')
    if (!Array.isArray(messages) || messages.length === 0) {
      return response.badRequest({ error: 'messages is required' })
    }

    const queue = new AiQueueService()
    await queue.enqueueChat({ messages })

    return response.accepted({ status: 'queued' })
  }
}
