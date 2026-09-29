export class ReservationNotFoundError extends Error {
  name = 'ReservationNotFoundError'
}

export class ReservationConflictError extends Error {
  name = 'ReservationConflictError'

  constructor() {
    super('Reservation period overlaps with an existing reservation')
  }
}

/**
 * La période chevauche un créneau importé d'un calendrier externe (#880) : le
 * bateau est déjà loué sur une autre plateforme.
 */
export class ReservationExternalConflictError extends Error {
  name = 'ReservationExternalConflictError'

  constructor(readonly calendarName: string) {
    super(`Reservation period overlaps a booking imported from ${calendarName}`)
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

/**
 * Encaissement ou geste de caution refusé par les règles de #875 (ex. solde
 * sans prix, caution restituée sans avoir été bloquée). `errorCode` est la clé
 * de `flash.reservation.payment.*`.
 */
export class ReservationPaymentError extends Error {
  name = 'ReservationPaymentError'

  constructor(readonly errorCode: string) {
    super(`reservation payment rejected: ${errorCode}`)
  }
}
