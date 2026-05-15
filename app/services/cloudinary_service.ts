import type { MultipartFile } from '@adonisjs/core/bodyparser'
import cloudinary from '#config/cloudinary'

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
  boat: (orgSlug: string, boatId: number) => `organizations/${orgSlug}/boats/${boatId}`,

  boatPhotos: (orgSlug: string, boatId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/photos`,

  boatDocuments: (orgSlug: string, boatId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/documents`,

  boatEngine: (orgSlug: string, boatId: number, engineId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/engines/${engineId}`,

  boatEnginePhotos: (orgSlug: string, boatId: number, engineId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/engines/${engineId}/photos`,

  boatEngineDocuments: (orgSlug: string, boatId: number, engineId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/engines/${engineId}/documents`,

  boatSail: (orgSlug: string, boatId: number, sailId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/sails/${sailId}`,

  boatSailPhotos: (orgSlug: string, boatId: number, sailId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/sails/${sailId}/photos`,

  boatSailDocuments: (orgSlug: string, boatId: number, sailId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/sails/${sailId}/documents`,

  boatRig: (orgSlug: string, boatId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/rig`,

  boatRigPhotos: (orgSlug: string, boatId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/rig/photos`,

  boatRigDocuments: (orgSlug: string, boatId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/rig/documents`,

  maintenance: (orgSlug: string, boatId: number, eventId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/maintenance/${eventId}`,

  maintenancePhotos: (orgSlug: string, boatId: number, eventId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/maintenance/${eventId}/photos`,

  maintenanceDocuments: (orgSlug: string, boatId: number, eventId: number) =>
    `organizations/${orgSlug}/boats/${boatId}/maintenance/${eventId}/documents`,

  userAvatar: (orgSlug: string, userId: number) =>
    `organizations/${orgSlug}/users/${userId}/avatar`,
}

export class CloudinaryService {
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
    return this.upload(file, folder, 'raw', options)
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

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      originalFilename: result.original_filename,
    }
  }
}
