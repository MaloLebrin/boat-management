import type { BoatUnavailabilityWindow } from '#shared/types/boat_status'

export class BoatNotFoundError extends Error {
  name = 'BoatNotFoundError'
}

export class BoatEquipmentNotFoundError extends Error {
  name = 'BoatEquipmentNotFoundError'
}

export class RegistrationNumberTakenError extends Error {
  name = 'RegistrationNumberTakenError'
}

/** Nom encore porté par un bateau en corbeille (#858). */
export class TrashedBoatNameHeldError extends Error {
  name = 'TrashedBoatNameHeldError'
}

/** Immatriculation encore portée par un bateau en corbeille (#858). */
export class TrashedBoatRegistrationHeldError extends Error {
  name = 'TrashedBoatRegistrationHeldError'
}

export class InvalidBoatHullError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBoatHullError'
  }
}

export class InvalidBoatOwnerAssignmentError extends Error {
  name = 'InvalidBoatOwnerAssignmentError'
}

/**
 * Le bateau est indisponible sur la période demandée (#870) : statut
 * immobilisant, tâche datée ou incident ouvert. `forceable` vaut `false` pour
 * un bateau vendu — aucun motif ne permet d'y poser une réservation.
 */
export class BoatUnavailableError extends Error {
  name = 'BoatUnavailableError'

  constructor(
    readonly windows: BoatUnavailabilityWindow[],
    readonly forceable: boolean
  ) {
    super('Boat is unavailable over the requested period')
  }
}

/** Le statut demandé est déjà celui du bateau (#870). */
export class BoatStatusUnchangedError extends Error {
  name = 'BoatStatusUnchangedError'
}
