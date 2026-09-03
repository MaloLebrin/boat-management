import type AiPartSearchConversation from '#models/ai_part_search_conversation'
import type {
  PartSearchConversationProps,
  PublicPartSearchConversationProps,
} from '#shared/types/spare_part_chat'

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

/**
 * Variante de la page publique (Phase 2) : les mêmes props plus le snapshot
 * moteur qui alimente les liens revendeurs — le numéro de série n'en sort
 * jamais, `tokensUsed` non plus.
 */
export function toPublicPartSearchConversationProps(
  conversation: AiPartSearchConversation
): PublicPartSearchConversationProps {
  return {
    ...toPartSearchConversationProps(conversation),
    engine: {
      brand: conversation.context?.brand ?? null,
      model: conversation.context?.model ?? null,
      catalogBrandSlug: conversation.context?.catalogBrandSlug ?? null,
    },
  }
}
