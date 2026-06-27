export class ReservationNotFoundError extends Error {
  name = 'ReservationNotFoundError'
}

export class ReservationConflictError extends Error {
  name = 'ReservationConflictError'
  status = 409
  code = 'E_RESERVATION_CONFLICT'

  constructor(readonly conflictingId: number) {
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
