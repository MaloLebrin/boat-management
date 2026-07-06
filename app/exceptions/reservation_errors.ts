export class ReservationNotFoundError extends Error {
  name = 'ReservationNotFoundError'
}

export class ReservationConflictError extends Error {
  name = 'ReservationConflictError'

  constructor() {
    super('Reservation period overlaps with an existing reservation')
  }
}

export class ReservationValidationError extends Error {
  name = 'ReservationValidationError'

  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}

export class ReservationDurationError extends Error {
  name = 'ReservationDurationError'

  constructor(readonly reason: 'below_min' | 'above_max') {
    super(`reservation duration ${reason}`)
  }
}

/**
 * Raised when creating/updating a reservation linked to a blacklisted client (#275).
 */
export class ReservationBlacklistedClientError extends Error {
  name = 'ReservationBlacklistedClientError'

  constructor() {
    super('Cannot book for a blacklisted client')
  }
}
