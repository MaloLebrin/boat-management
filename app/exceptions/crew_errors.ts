import type { CrewConflict } from '#shared/types/crew'

export class CrewMemberNotFoundError extends Error {
  name = 'CrewMemberNotFoundError'
}

export class CrewCertificationNotFoundError extends Error {
  name = 'CrewCertificationNotFoundError'
}

/**
 * L'équipier est déjà embarqué sur une réservation qui recoupe ce créneau, ou
 * s'est déclaré indisponible (#883). `conflicts` détaille ce qui bloque.
 */
export class CrewMemberUnavailableError extends Error {
  name = 'CrewMemberUnavailableError'

  constructor(public readonly conflicts: CrewConflict[]) {
    super('Crew member is unavailable on these dates')
  }
}

export class CrewMemberAlreadyAssignedError extends Error {
  name = 'CrewMemberAlreadyAssignedError'
}

/** Une réservation annulée n'embarque plus personne (#883). */
export class CrewAssignmentReservationCancelledError extends Error {
  name = 'CrewAssignmentReservationCancelledError'
}

export class CrewAssignmentNotFoundError extends Error {
  name = 'CrewAssignmentNotFoundError'
}

export class CrewUnavailabilityNotFoundError extends Error {
  name = 'CrewUnavailabilityNotFoundError'
}
