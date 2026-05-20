export class BoatMaintenanceNotFoundError extends Error {
  name = 'BoatMaintenanceNotFoundError'
}

export class BoatMaintenanceValidationError extends Error {
  name = 'BoatMaintenanceValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}

export class BoatMaintenanceTaskNotFoundError extends Error {
  name = 'BoatMaintenanceTaskNotFoundError'
}

export class BoatMaintenanceTaskValidationError extends Error {
  name = 'BoatMaintenanceTaskValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}

export class BoatMaintenanceSheetNotFoundError extends Error {
  name = 'BoatMaintenanceSheetNotFoundError'
}

export class BoatMaintenanceSheetItemNotFoundError extends Error {
  name = 'BoatMaintenanceSheetItemNotFoundError'
}
