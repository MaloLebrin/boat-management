import { REPORT_PERIOD_PRESETS } from '#shared/types/reporting'
import vine from '@vinejs/vine'

const isoDate = () =>
  vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()

/**
 * Filtres du reporting de flotte (#887), en query string. Une plage
 * personnalisée incohérente n'est pas une erreur : `resolveReportPeriod`
 * retombe alors sur le mois courant.
 */
export const reportQueryValidator = vine.create(
  vine.object({
    period: vine.enum(REPORT_PERIOD_PRESETS).optional(),
    from: isoDate(),
    to: isoDate(),
    boat: vine.number().withoutDecimals().positive().optional(),
  })
)
