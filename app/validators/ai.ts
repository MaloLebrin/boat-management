import { ENGINE_DIAGNOSIS_MODES } from '#shared/types/ai'
import vine from '@vinejs/vine'

export const aiChatValidator = vine.compile(
  vine.object({
    messages: vine
      .array(
        vine.object({
          role: vine.enum(['user', 'assistant'] as const),
          content: vine.string().minLength(1).maxLength(4000),
        })
      )
      .minLength(1)
      .maxLength(50),
  })
)

/**
 * Diagnostic de panne moteur (#516). En mode `symptoms` la description est
 * obligatoire (mêmes bornes que le chat IA) ; en mode `progress` les notes
 * sont optionnelles — les étapes cochées sont chargées côté serveur.
 */
export const engineDiagnosisValidator = vine.compile(
  vine.object({
    mode: vine.enum(ENGINE_DIAGNOSIS_MODES),
    symptoms: vine
      .string()
      .trim()
      .minLength(1)
      .maxLength(4000)
      .optional()
      .requiredWhen('mode', '=', 'symptoms'),
    notes: vine.string().trim().maxLength(4000).optional(),
  })
)
