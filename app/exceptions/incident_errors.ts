export class BoatIncidentNotFoundError extends Error {
  name = 'BoatIncidentNotFoundError'
}

export class BoatIncidentValidationError extends Error {
  name = 'BoatIncidentValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}
