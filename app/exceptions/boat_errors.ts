export class BoatNotFoundError extends Error {
  name = 'BoatNotFoundError'
}

export class BoatEquipmentNotFoundError extends Error {
  name = 'BoatEquipmentNotFoundError'
}

export class InvalidBoatHullError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBoatHullError'
  }
}
