import vine from '@vinejs/vine'
import { TELEMETRY_MAX_BATCH_SIZE, TELEMETRY_PATH_MAX_LENGTH } from '#shared/constants/instruments'

/**
 * Formulaire de source Signal K (#988). L'origine est validée finement par
 * `normalizeInstrumentBaseUrl` dans le service (`InvalidInstrumentBaseUrlError`).
 * `token` absent = conserver, `null`/vide = effacer, chaîne = remplacer.
 */
export const upsertInstrumentSourceValidator = vine.create(
  vine.object({
    baseUrl: vine.string().trim().minLength(1).maxLength(255),
    token: vine.string().trim().maxLength(512).nullable().optional(),
    vesselContext: vine.string().trim().maxLength(120).nullable().optional(),
    enabled: vine.boolean().optional(),
  })
)

/** `2026-10-19T08:41:00Z`, `2026-10-19T08:41:00.250+02:00`… — la valeur est relue par Luxon dans le service. */
const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})$/

/**
 * Lot de télémétrie. La liste blanche des chemins, la cohérence
 * `value`/`valueJson` et la tolérance sur `recordedAt` (D9) sont du ressort
 * de `TelemetryIngestService.prepare` : ici, la forme seulement.
 */
export const ingestTelemetryValidator = vine.create(
  vine.object({
    sourceId: vine.number().positive().withoutDecimals(),
    batchId: vine.string().trim().minLength(1).maxLength(64),
    samples: vine
      .array(
        vine.object({
          path: vine.string().trim().minLength(1).maxLength(TELEMETRY_PATH_MAX_LENGTH),
          recordedAt: vine.string().trim().regex(ISO_DATETIME),
          value: vine.number().nullable().optional(),
          valueJson: vine.any().nullable().optional(),
        })
      )
      .minLength(1)
      .maxLength(TELEMETRY_MAX_BATCH_SIZE),
  })
)
