import type { ConflictLogEntrySnapshot, ConflictLogSnapshot } from '#shared/types/navigation_log'

export class NavigationLogNotFoundError extends Error {
  name = 'NavigationLogNotFoundError'
}

export class NavigationLogInProgressError extends Error {
  name = 'NavigationLogInProgressError'
}

export class NavigationLogConflictError extends Error {
  name = 'NavigationLogConflictError'
  constructor(public readonly currentLog: ConflictLogSnapshot) {
    super('Conflict detected')
  }
}

export class NavigationLogEntryNotFoundError extends Error {
  name = 'NavigationLogEntryNotFoundError'
}

export class NavigationLogEntryNotEditableError extends Error {
  name = 'NavigationLogEntryNotEditableError'
}

/**
 * Un point de journal modifié entre-temps (#725). Un point se saisit **en mer**,
 * là où il n'y a pas de réseau : deux équipiers qui corrigent le même point
 * pendant la sortie doivent arbitrer au retour, pas s'écraser en silence.
 */
export class NavigationLogEntryConflictError extends Error {
  name = 'NavigationLogEntryConflictError'
  constructor(public readonly currentEntry: ConflictLogEntrySnapshot) {
    super('Conflict detected')
  }
}

export class NavigationLogValidationError extends Error {
  name = 'NavigationLogValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}
