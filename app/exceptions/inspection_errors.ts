export class BoatInspectionNotFoundError extends Error {
  name = 'BoatInspectionNotFoundError'
}

export class BoatInspectionValidationError extends Error {
  name = 'BoatInspectionValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}
