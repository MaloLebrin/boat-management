import {
  ASSISTANT_MESSAGE_MAX_LENGTH,
  ASSISTANT_PAGE_URL_MAX_LENGTH,
  ASSISTANT_TZ_OFFSET_MAX,
  ASSISTANT_TZ_OFFSET_MIN,
} from '#shared/types/assistant'
import vine from '@vinejs/vine'

/**
 * Copilote FleetAi : le corps porte le message et, optionnellement, l'URL de
 * la page depuis laquelle l'utilisateur écrit (contexte de page — jamais
 * stockée) et le décalage de fuseau du navigateur. Le contexte flotte est
 * reconstruit côté serveur à chaque tour, et une confirmation d'action ne
 * porte aucun payload (la proposition stockée fait foi) — c'est pourquoi
 * l'offset est recopié dans l'action en attente au moment de la proposition.
 */
export const assistantMessageValidator = vine.create({
  message: vine.string().trim().minLength(1).maxLength(ASSISTANT_MESSAGE_MAX_LENGTH),
  pageUrl: vine.string().trim().maxLength(ASSISTANT_PAGE_URL_MAX_LENGTH).optional(),
  tzOffsetMinutes: vine
    .number()
    .withoutDecimals()
    .min(ASSISTANT_TZ_OFFSET_MIN)
    .max(ASSISTANT_TZ_OFFSET_MAX)
    .optional(),
})
