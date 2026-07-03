export class BoatNotFoundError extends Error {
  name = 'BoatNotFoundError'
}

export class BoatEquipmentNotFoundError extends Error {
  name = 'BoatEquipmentNotFoundError'
}

export class RegistrationNumberTakenError extends Error {
  name = 'RegistrationNumberTakenError'
}

export class InvalidBoatHullError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBoatHullError'
  }
}
