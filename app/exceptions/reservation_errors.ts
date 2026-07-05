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
