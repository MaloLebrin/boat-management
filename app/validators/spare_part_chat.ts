import { PART_SEARCH_MESSAGE_MAX_LENGTH } from '#shared/types/spare_part_chat'
import vine from '@vinejs/vine'

/**
 * Chat IA de recherche de références de pièces (#634). Le moteur vient de
 * l'URL et son contexte est snapshoté côté serveur : le corps ne porte que le
 * message, au démarrage comme en cours de conversation.
 */
export const sparePartChatMessageValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(1).maxLength(PART_SEARCH_MESSAGE_MAX_LENGTH),
  })
)
