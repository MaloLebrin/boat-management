import RunAiChat, { type RunAiChatPayload } from '#jobs/run_ai_chat'
import QueueDedupService from '#services/queue_dedup_service'

export default class AiQueueService {
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

    const dedup = new QueueDedupService()
    await dedup.enqueueUnique({
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
