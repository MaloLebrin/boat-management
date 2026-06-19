export class BoatFuelLogNotFoundError extends Error {
  name = 'BoatFuelLogNotFoundError'
}

export class BoatFuelLogForbiddenError extends Error {
  name = 'BoatFuelLogForbiddenError'
}

export class BoatFuelLogValidationError extends Error {
  name = 'BoatFuelLogValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}
