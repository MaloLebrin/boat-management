export class BoatDocumentNotFoundError extends Error {
  constructor(id: number) {
    super(`BoatDocument not found: ${id}`)
    this.name = 'BoatDocumentNotFoundError'
  }
}
