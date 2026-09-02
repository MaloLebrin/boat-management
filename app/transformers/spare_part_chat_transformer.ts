import type AiPartSearchConversation from '#models/ai_part_search_conversation'
import type { PartSearchConversationProps } from '#shared/types/spare_part_chat'

/** Comme le chat public (#602) : `tokensUsed` et le snapshot ne sortent pas. */
export function toPartSearchConversationProps(
  conversation: AiPartSearchConversation
): PartSearchConversationProps {
  return {
    token: conversation.token,
    status: conversation.status,
    phase: conversation.phase,
    messages: conversation.messages,
    result: conversation.result,
    identificationFailed: conversation.context?.identificationFailed ?? false,
  }
}
