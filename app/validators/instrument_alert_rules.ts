import vine from '@vinejs/vine'
import { TELEMETRY_PATH_MAX_LENGTH } from '#shared/constants/instruments'

/**
 * Règle de seuil (#993). `threshold` et `hysteresis` sont dans l'unité
 * d'affichage du chemin ; `InstrumentAlertRuleService` vérifie que le chemin
 * est numérique et les convertit en SI.
 */
export const upsertInstrumentAlertRuleValidator = vine.create(
  vine.object({
    path: vine.string().trim().minLength(1).maxLength(TELEMETRY_PATH_MAX_LENGTH),
    operator: vine.enum(['lt', 'gt'] as const),
    threshold: vine.number(),
    hysteresis: vine.number().min(0).optional(),
    severity: vine.enum(['warning', 'critical'] as const),
    enabled: vine.boolean().optional(),
  })
)
