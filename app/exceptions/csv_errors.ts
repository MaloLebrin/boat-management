export class CsvImportValidationError extends Error {
  name = 'CsvImportValidationError'
  constructor(
    message: string,
    readonly errorCode: string
  ) {
    super(message)
  }
}

/**
 * Le fichier envoyé ne se lit pas : classeur `.xlsx` corrompu, ou un fichier
 * renommé en `.xlsx` qui n'est pas un classeur. Le contrôleur le traduit en
 * flash `flash.csv.fileUnreadable`.
 */
export class TableFileUnreadableError extends Error {
  name = 'TableFileUnreadableError'
  constructor(cause?: unknown) {
    super('Uploaded table file could not be read', cause === undefined ? undefined : { cause })
  }
}
