export class BoatFuelLogNotFoundError extends Error {
  name = 'BoatFuelLogNotFoundError'
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
