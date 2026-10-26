import vine from '@vinejs/vine'
import {
  INSTRUMENT_PAIRING_DEVICE_CODE_MAX_LENGTH,
  INSTRUMENT_PAIRING_DEVICE_LABEL_MAX_LENGTH,
  INSTRUMENT_PAIRING_HARDWARE_KIND_MAX_LENGTH,
  INSTRUMENT_PAIRING_PLUGIN_VERSION_MAX_LENGTH,
  TELEMETRY_MAX_BATCH_SIZE,
  TELEMETRY_PATH_MAX_LENGTH,
} from '#shared/constants/instruments'

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

/**
 * Lot du plugin (#994) : le contrat de `ingestTelemetryValidator`, mais
 * `sourceId` est facultatif — le jeton désigne déjà la source. S'il est
 * fourni, il doit être celui de la source authentifiée.
 */
export const ingestTelemetryApiValidator = vine.create(
  vine.object({
    sourceId: vine.number().positive().withoutDecimals().optional(),
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

/** Texte libre affiché au client : pas de caractères de contrôle ni de mise en forme. */
const PLAIN_TEXT = /^[^\p{Cc}\p{Cf}]*$/u
const SLUG = /^[a-z0-9][a-z0-9_-]*$/
const VERSION = /^[0-9A-Za-z][0-9A-Za-z.+_-]*$/

/**
 * Création d'un appairage (#1032), sans authentification : tout est facultatif
 * et borné. Les champs inconnus sont ignorés.
 */
export const createInstrumentPairingValidator = vine.create(
  vine.object({
    deviceLabel: vine
      .string()
      .trim()
      .minLength(1)
      .maxLength(INSTRUMENT_PAIRING_DEVICE_LABEL_MAX_LENGTH)
      .regex(PLAIN_TEXT)
      .nullable()
      .optional(),
    hardwareKind: vine
      .string()
      .trim()
      .maxLength(INSTRUMENT_PAIRING_HARDWARE_KIND_MAX_LENGTH)
      .regex(SLUG)
      .nullable()
      .optional(),
    pluginVersion: vine
      .string()
      .trim()
      .maxLength(INSTRUMENT_PAIRING_PLUGIN_VERSION_MAX_LENGTH)
      .regex(VERSION)
      .nullable()
      .optional(),
  })
)

export const pollInstrumentPairingValidator = vine.create(
  vine.object({
    deviceCode: vine
      .string()
      .trim()
      .minLength(1)
      .maxLength(INSTRUMENT_PAIRING_DEVICE_CODE_MAX_LENGTH),
  })
)

/** Code saisi par l'admin : la forme exacte est jugée par le service (même erreur qu'un code inconnu). */
export const attachInstrumentPairingValidator = vine.create(
  vine.object({
    userCode: vine.string().trim().minLength(1).maxLength(32),
  })
)
