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
