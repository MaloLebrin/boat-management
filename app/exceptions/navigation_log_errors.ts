import type { ConflictLogSnapshot } from '#shared/types/navigation_log'

export class NavigationLogNotFoundError extends Error {
  name = 'NavigationLogNotFoundError'
}

export class NavigationLogConflictError extends Error {
  name = 'NavigationLogConflictError'
  constructor(public readonly currentLog: ConflictLogSnapshot) {
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
