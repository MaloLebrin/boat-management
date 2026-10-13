import type { ConflictIncidentSnapshot } from '#shared/types/incident'

export class BoatIncidentNotFoundError extends Error {
  name = 'BoatIncidentNotFoundError'
}

export class BoatIncidentValidationError extends Error {
  name = 'BoatIncidentValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}

/** L'incident a été modifié depuis que le rejeu hors-ligne l'a lu (#970). */
export class BoatIncidentConflictError extends Error {
  name = 'BoatIncidentConflictError'
  constructor(readonly currentIncident: ConflictIncidentSnapshot) {
    super('Conflict detected')
  }
}
