export class NavigationLogNotFoundError extends Error {
  name = 'NavigationLogNotFoundError'
}

export class NavigationLogValidationError extends Error {
  name = 'NavigationLogValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}
