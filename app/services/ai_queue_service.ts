import RunAiChat, { type RunAiChatPayload } from '#jobs/run_ai_chat'

export default class AiQueueService {
  async enqueueChat(payload: RunAiChatPayload) {
    await RunAiChat.dispatch(payload)
  }
}
