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

/**
 * L'état des lieux est signé (#889) : constats, photos, défauts et relevés sont
 * figés — comme une facture émise.
 */
export class BoatInspectionLockedError extends Error {
  name = 'BoatInspectionLockedError'
  constructor() {
    super('inspection is signed and locked')
  }
}

/** Envoi demandé avant signature : on n'envoie au client que le PDF signé (#889). */
export class BoatInspectionNotSignedError extends Error {
  name = 'BoatInspectionNotSignedError'
  constructor() {
    super('inspection is not signed yet')
  }
}

/** Ni la réservation ni la fiche client ne portent d'e-mail (#889). */
export class BoatInspectionNoClientEmailError extends Error {
  name = 'BoatInspectionNoClientEmailError'
  constructor() {
    super('no client email for this inspection')
  }
}
