import RunAiChat, { type RunAiChatPayload } from '#jobs/run_ai_chat'
import QueueDedupService from '#services/queue_dedup_service'
import { inject } from '@adonisjs/core'

@inject()
export default class AiQueueService {
  constructor(private dedup: QueueDedupService) {}

  async enqueueChat(options: {
    userId: number
    messages: RunAiChatPayload['messages']
    correlationId?: string
  }) {
    const key = RunAiChat.dedupKey(options)
    const payload: RunAiChatPayload = {
      messages: options.messages,
      correlationId: options.correlationId,
      dedupKey: key,
    }

    await this.dedup.enqueueUnique({
      key,
      jobName: RunAiChat.name,
      queue: 'ai',
      payload,
      dispatch: async (p) => {
        await RunAiChat.dispatch(p)
      },
    })
  }
}
