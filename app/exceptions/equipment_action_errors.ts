export class BoatEquipmentActionNotFoundError extends Error {
  name = 'BoatEquipmentActionNotFoundError'
}

export class BoatEquipmentActionValidationError extends Error {
  name = 'BoatEquipmentActionValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}
