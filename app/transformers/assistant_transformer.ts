import type AiAssistantConversation from '#models/ai_assistant_conversation'
import type { AssistantConversationProps } from '#shared/types/assistant'

/** `tokensUsed` ne sort pas — même règle que les autres chats IA (#602, #634). */
export function toAssistantConversationProps(
  conversation: AiAssistantConversation
): AssistantConversationProps {
  return {
    token: conversation.token,
    status: conversation.status,
    messages: conversation.messages,
    pendingAction: conversation.pendingAction,
    userMessagesCount: conversation.messages.filter((m) => m.role === 'user').length,
  }
}
