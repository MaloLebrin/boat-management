import { PUBLIC_DIAGNOSIS_MESSAGE_MAX_LENGTH } from '#shared/types/public_diagnosis'
import vine from '@vinejs/vine'

/**
 * Chat public de diagnostic de panne (#602). Mêmes bornes de message que le
 * chat IA authentifié (`aiChatValidator`) ; le contexte moteur du 1er message
 * est du texte libre optionnel — aucune entité en base.
 */
export const publicDiagnosisStartValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(1).maxLength(PUBLIC_DIAGNOSIS_MESSAGE_MAX_LENGTH),
    engineType: vine.string().trim().minLength(1).maxLength(120).optional(),
    brand: vine.string().trim().minLength(1).maxLength(120).optional(),
    hours: vine.number().min(0).max(100000).optional(),
  })
)

export const publicDiagnosisMessageValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(1).maxLength(PUBLIC_DIAGNOSIS_MESSAGE_MAX_LENGTH),
  })
)
