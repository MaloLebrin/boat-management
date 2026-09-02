import type { ConflictInspectionSnapshot } from '#shared/types/inspection'

export class BoatInspectionNotFoundError extends Error {
  name = 'BoatInspectionNotFoundError'
}

export class BoatInspectionValidationError extends Error {
  name = 'BoatInspectionValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}

/** Le PUT rejoué vise une inspection modifiée depuis la mise hors-ligne (#622). */
export class BoatInspectionConflictError extends Error {
  name = 'BoatInspectionConflictError'
  constructor(public readonly currentInspection: ConflictInspectionSnapshot) {
    super('Conflict detected')
  }
}
