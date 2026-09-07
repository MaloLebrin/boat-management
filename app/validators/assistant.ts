import {
  ASSISTANT_MESSAGE_MAX_LENGTH,
  ASSISTANT_PAGE_URL_MAX_LENGTH,
} from '#shared/types/assistant'
import vine from '@vinejs/vine'

/**
 * Copilote FleetAi : le corps porte le message et, optionnellement, l'URL de
 * la page depuis laquelle l'utilisateur écrit (contexte de page — jamais
 * stockée). Le contexte flotte est reconstruit côté serveur à chaque tour, et
 * une confirmation d'action ne porte aucun payload (la proposition stockée
 * fait foi).
 */
export const assistantMessageValidator = vine.create({
  message: vine.string().trim().minLength(1).maxLength(ASSISTANT_MESSAGE_MAX_LENGTH),
  pageUrl: vine.string().trim().maxLength(ASSISTANT_PAGE_URL_MAX_LENGTH).optional(),
})
