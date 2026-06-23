export class CsvImportValidationError extends Error {
  name = 'CsvImportValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}
