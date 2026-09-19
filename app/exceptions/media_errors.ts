export class MediaNotFoundError extends Error {
  name = 'MediaNotFoundError'
}

export class MissingTmpPathError extends Error {
  constructor() {
    super('File has no tmpPath — ensure bodyparser autoProcess is enabled')
    this.name = 'MissingTmpPathError'
  }
}

export class CloudinaryDownloadError extends Error {
  constructor(status: number, statusText: string) {
    super(`Cloudinary download failed: ${status} ${statusText}`)
    this.name = 'CloudinaryDownloadError'
  }
}

/**
 * Ghostscript a dépassé sa limite de temps et a été abattu (#772). Distinguée
 * d'un échec de compression ordinaire pour que le repli sur le PDF original
 * reste journalisé à part : un pic de timeouts est un signal d'abus.
 */
export class PdfCompressionTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Ghostscript exceeded its ${timeoutMs}ms compression timeout and was killed`)
    this.name = 'PdfCompressionTimeoutError'
  }
}
