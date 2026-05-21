import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import cloudinary from '#config/cloudinary'
import { PdfService } from '#services/pdf_service'

function envPrefix(): string {
  return app.inProduction ? 'production' : 'dev'
}

export interface CloudinaryUploadResult {
  publicId: string
  url: string
  secureUrl: string
  format: string
  resourceType: string
  bytes: number
  width?: number
  height?: number
  originalFilename: string
}

type UploadOptions = {
  publicId?: string
  tags?: string[]
  transformation?: Record<string, unknown>[]
}

export const CloudinaryFolders = {
  boat: (orgSlug: string, boatId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}`,

  boatPhotos: (orgSlug: string, boatId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/photos`,

  boatDocuments: (orgSlug: string, boatId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/documents`,

  boatEngine: (orgSlug: string, boatId: number, engineId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/engines/${engineId}`,

  boatEnginePhotos: (orgSlug: string, boatId: number, engineId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/engines/${engineId}/photos`,

  boatEngineDocuments: (orgSlug: string, boatId: number, engineId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/engines/${engineId}/documents`,

  boatSail: (orgSlug: string, boatId: number, sailId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/sails/${sailId}`,

  boatSailPhotos: (orgSlug: string, boatId: number, sailId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/sails/${sailId}/photos`,

  boatSailDocuments: (orgSlug: string, boatId: number, sailId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/sails/${sailId}/documents`,

  boatRig: (orgSlug: string, boatId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/rig`,

  boatRigPhotos: (orgSlug: string, boatId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/rig/photos`,

  boatRigDocuments: (orgSlug: string, boatId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/rig/documents`,

  maintenance: (orgSlug: string, boatId: number, eventId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/maintenance/${eventId}`,

  maintenancePhotos: (orgSlug: string, boatId: number, eventId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/maintenance/${eventId}/photos`,

  maintenanceDocuments: (orgSlug: string, boatId: number, eventId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/boats/${boatId}/maintenance/${eventId}/documents`,

  userAvatar: (orgSlug: string, userId: number) =>
    `${envPrefix()}/organizations/${orgSlug}/users/${userId}/avatar`,
}

@inject()
export class CloudinaryService {
  constructor(private pdfService: PdfService) {}
  async uploadImage(
    file: MultipartFile,
    folder: string,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    return this.upload(file, folder, 'image', options)
  }

  async uploadDocument(
    file: MultipartFile,
    folder: string,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    if (file.extname === 'pdf') {
      return this.uploadCompressedPdf(file, folder, options)
    }
    return this.upload(file, folder, 'raw', options)
  }


  private async uploadCompressedPdf(
    file: MultipartFile,
    folder: string,
    options: UploadOptions
  ): Promise<CloudinaryUploadResult> {
    if (!file.tmpPath) {
      throw new Error('File has no tmpPath — ensure bodyparser autoProcess is enabled')
    }

    let compressedResult: { outputPath: string; cleanup: () => Promise<void> } | null = null

    try {
      compressedResult = await this.pdfService.compress(file.tmpPath)
      return await this.uploadFromPath(
        compressedResult!.outputPath,
        file.clientName,
        folder,
        'raw',
        options
      )
    } catch (error) {
      logger.warn({ error }, 'PDF compression failed, uploading original file')
      return this.upload(file, folder, 'raw', options)
    } finally {
      if (compressedResult) {
        await compressedResult.cleanup()
      }
    }
  }

  private async uploadFromPath(
    filePath: string,
    originalFilename: string,
    folder: string,
    resourceType: 'image' | 'raw',
    options: UploadOptions
  ): Promise<CloudinaryUploadResult> {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      public_id: options.publicId,
      tags: options.tags,
      transformation: options.transformation,
      use_filename: true,
      unique_filename: true,
    })

    const ext = originalFilename.split('.').pop() ?? ''
    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format || ext,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      originalFilename: originalFilename.replace(/\.[^.]+$/, ''),
    }
  }

  async downloadAsBuffer(
    publicId: string,
    resourceType: 'image' | 'raw',
    format: string
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const downloadUrl = cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: 'upload',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    })

    const fetchResponse = await fetch(downloadUrl)
    if (!fetchResponse.ok) {
      throw new Error(`Cloudinary download failed: ${fetchResponse.status} ${fetchResponse.statusText}`)
    }

    const buffer = Buffer.from(await fetchResponse.arrayBuffer())
    const contentType = fetchResponse.headers.get('content-type') ?? 'application/octet-stream'
    return { buffer, contentType }
  }

  async deleteFile(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  }

  async deleteFolder(folderPath: string): Promise<void> {
    await cloudinary.api.delete_resources_by_prefix(folderPath)
    await cloudinary.api.delete_folder(folderPath)
  }

  private async upload(
    file: MultipartFile,
    folder: string,
    resourceType: 'image' | 'raw',
    options: UploadOptions
  ): Promise<CloudinaryUploadResult> {
    if (!file.tmpPath) {
      throw new Error('File has no tmpPath — ensure bodyparser autoProcess is enabled')
    }

    const result = await cloudinary.uploader.upload(file.tmpPath, {
      folder,
      resource_type: resourceType,
      public_id: options.publicId,
      tags: options.tags,
      transformation: options.transformation,
      use_filename: true,
      unique_filename: true,
    })

    const ext = (file.clientName ?? '').split('.').pop() ?? ''
    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format || ext,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      originalFilename: result.original_filename,
    }
  }
}
