import type AiDiagnosisConversation from '#models/ai_diagnosis_conversation'
import type { PublicDiagnosisConversationProps } from '#shared/types/public_diagnosis'

export function toPublicDiagnosisConversationProps(
  conversation: AiDiagnosisConversation
): PublicDiagnosisConversationProps {
  return {
    token: conversation.token,
    status: conversation.status,
    messages: conversation.messages,
    result: conversation.result,
  }
}
