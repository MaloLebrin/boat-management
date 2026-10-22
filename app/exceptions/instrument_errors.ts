/** Erreurs des instruments de bord Signal K (#988) : sources et ingestion. */

/** Le bateau n'a pas de source, ou le `sourceId` du lot ne désigne pas la sienne. */
export class InstrumentSourceNotFoundError extends Error {
  name = 'InstrumentSourceNotFoundError'
}

/** La source est désactivée : rien n'est ingéré tant qu'un admin ne la réactive pas. */
export class InstrumentSourceDisabledError extends Error {
  name = 'InstrumentSourceDisabledError'
}

/** `baseUrl` n'est pas une origine `https?://hôte[:port]` (chemin, identifiants, schéma). */
export class InvalidInstrumentBaseUrlError extends Error {
  name = 'InvalidInstrumentBaseUrlError'
}

export class TelemetryBatchTooLargeError extends Error {
  name = 'TelemetryBatchTooLargeError'

  constructor(
    readonly size: number,
    readonly max: number
  ) {
    super(`Telemetry batch of ${size} samples exceeds ${max}`)
  }
}

/** Le chemin n'est pas dans la liste blanche `INSTRUMENT_PATH_CATALOG`. */
export class TelemetryPathNotAllowedError extends Error {
  name = 'TelemetryPathNotAllowedError'

  constructor(readonly path: string) {
    super(`Telemetry path "${path}" is not allowed`)
  }
}

/** `recordedAt` illisible, ou dans le futur au-delà de la tolérance (D9). */
export class TelemetryRecordedAtInvalidError extends Error {
  name = 'TelemetryRecordedAtInvalidError'

  constructor(
    readonly recordedAt: string,
    readonly reason: 'unparsable' | 'future'
  ) {
    super(`Telemetry recordedAt "${recordedAt}" is ${reason}`)
  }
}

/** Valeur numérique hors de ce que la colonne `numeric(14,4)` accepte, ou non finie. */
export class TelemetryValueOutOfRangeError extends Error {
  name = 'TelemetryValueOutOfRangeError'

  constructor(
    readonly path: string,
    readonly value: number
  ) {
    super(`Telemetry value ${value} for "${path}" is out of range`)
  }
}

/** Un chemin numérique sans `value`, ou un chemin structuré sans `valueJson`. */
export class TelemetryValueKindMismatchError extends Error {
  name = 'TelemetryValueKindMismatchError'

  constructor(
    readonly path: string,
    readonly expected: 'number' | 'json'
  ) {
    super(`Telemetry path "${path}" expects a ${expected} value`)
  }
}

/** Chemin d'une règle d'alerte : hors catalogue, ou non numérique (#993). */
export class InstrumentAlertPathInvalidError extends Error {
  name = 'InstrumentAlertPathInvalidError'

  constructor(readonly path: string) {
    super(`Alert rule path "${path}" is not a numeric catalog path`)
  }
}

/** Une règle existe déjà pour ce chemin et cet opérateur sur le bateau (#993). */
export class InstrumentAlertRuleDuplicateError extends Error {
  name = 'InstrumentAlertRuleDuplicateError'
}

/** Plafond de règles par bateau atteint (#993). */
export class InstrumentAlertRuleLimitError extends Error {
  name = 'InstrumentAlertRuleLimitError'
}

export class InstrumentAlertRuleNotFoundError extends Error {
  name = 'InstrumentAlertRuleNotFoundError'
}
