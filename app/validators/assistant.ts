import { ASSISTANT_MESSAGE_MAX_LENGTH } from '#shared/types/assistant'
import vine from '@vinejs/vine'

/**
 * Copilote FleetAi : le corps ne porte que le message — le contexte flotte est
 * reconstruit côté serveur à chaque tour, et une confirmation d'action ne
 * porte aucun payload (la proposition stockée fait foi).
 */
export const assistantMessageValidator = vine.create({
  message: vine.string().trim().minLength(1).maxLength(ASSISTANT_MESSAGE_MAX_LENGTH),
})
