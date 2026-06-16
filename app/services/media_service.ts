import { MediaNotFoundError } from '#exceptions/media_errors'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import type { MediaEntityType, MediaKind } from '#shared/constants/media'
import type { UploadMediaPayload } from '#shared/types/media'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import Media from '#models/media'
import type Organization from '#models/organization'
import type User from '#models/user'
import { CloudinaryService } from '#services/cloudinary_service'
import QuotaService from '#services/quota_service'

export { MediaNotFoundError }
export type { UploadMediaPayload }

function resourceTypeFromKind(kind: MediaKind, format?: string): 'image' | 'raw' {
  if (kind === 'photo') return 'image'
  if (format === 'pdf') return 'image'
  return 'raw'
}

@inject()
export default class MediaService {
  constructor(
    private cloudinary: CloudinaryService,
    private quotaService: QuotaService
  ) {}

  async upload(
    user: User,
    file: MultipartFile,
    payload: UploadMediaPayload,
    org?: Organization
  ): Promise<Media> {
    // Guard: org absent for a non-user entity means a caller forgot to pass it — log a warning.
    if (!org && payload.entityType !== 'user') {
      logger.warn(
        { entityType: payload.entityType, entityId: payload.entityId },
        'MediaService.upload called without org for a non-user entity — storage quota not enforced'
      )
    }

    // assertCanUpload uses file.size (pre-upload) as an optimistic guard; the counter is updated
    // with uploaded.bytes (post-Cloudinary, after potential PDF compression). For compressed PDFs
    // the guard may be slightly conservative, but this avoids uploading a file that is certain to
    // exceed the limit.
    if (org && payload.entityType !== 'user' && file.size) {
      this.quotaService.assertCanUpload(org, file.size)
    }

    const resourceType = resourceTypeFromKind(payload.kind)

    const uploaded =
      resourceType === 'image'
        ? await this.cloudinary.uploadImage(file, payload.folder)
        : await this.cloudinary.uploadDocument(file, payload.folder)

    const position = await this.nextPosition(payload.entityType, payload.entityId)

    const media = await Media.create({
      entityType: payload.entityType,
      entityId: payload.entityId,
      kind: payload.kind,
      cloudinaryPublicId: uploaded.publicId,
      secureUrl: uploaded.secureUrl,
      originalFilename: uploaded.originalFilename,
      format: uploaded.format,
      bytes: uploaded.bytes,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
      position,
      caption: payload.caption?.trim() || null,
      uploadedById: user.id,
    })

    // Update storage usage after successful upload
    if (org && payload.entityType !== 'user') {
      await this.quotaService.updateStorageUsed(org, uploaded.bytes)
    }

    return media
  }

  async listForEntity(entityType: MediaEntityType, entityId: number): Promise<Media[]> {
    return await Media.query()
      .where('entityType', entityType)
      .where('entityId', entityId)
      .orderBy('position', 'asc')
  }

  /**
   * Gets a media by ID for a specific entity or returns null.
   */
  async getForEntity(
    mediaId: number,
    entityType: MediaEntityType,
    entityId: number
  ): Promise<Media | null> {
    return await Media.query()
      .where('id', mediaId)
      .where('entityType', entityType)
      .where('entityId', entityId)
      .first()
  }

  async deleteById(mediaId: number, org?: Organization): Promise<void> {
    const media = await Media.find(mediaId)
    if (!media) throw new MediaNotFoundError()

    if (!org && media.entityType !== 'user') {
      logger.warn(
        { mediaId, entityType: media.entityType },
        'MediaService.deleteById called without org — storage quota not decremented'
      )
    }

    const bytes = media.bytes ?? 0

    await this.cloudinary.deleteFile(
      media.cloudinaryPublicId,
      resourceTypeFromKind(media.kind, media.format)
    )
    await media.delete()

    if (org) {
      await this.quotaService.updateStorageUsed(org, -bytes)
    }
  }

  async deleteAllForEntity(
    entityType: MediaEntityType,
    entityId: number,
    folderPath: string,
    org?: Organization
  ): Promise<void> {
    if (!org) {
      logger.warn(
        { entityType, entityId },
        'MediaService.deleteAllForEntity called without org — storage quota not decremented'
      )
    }

    const medias = await Media.query()
      .where('entityType', entityType)
      .where('entityId', entityId)
      .select('bytes')

    const totalBytes = medias.reduce((sum, m) => sum + (m.bytes ?? 0), 0)

    await Media.query().where('entityType', entityType).where('entityId', entityId).delete()

    try {
      await this.cloudinary.deleteFolder(folderPath)
    } catch {
      // folder may not exist if no files were ever uploaded
    }

    if (org && totalBytes > 0) {
      await this.quotaService.updateStorageUsed(org, -totalBytes)
    }
  }

  async reorder(mediaIds: number[]): Promise<void> {
    await db.transaction(async (trx) => {
      for (const [index, id] of mediaIds.entries()) {
        await Media.query({ client: trx }).where('id', id).update({ position: index })
      }
    })
  }

  async replaceAvatar(user: User, file: MultipartFile, folder: string): Promise<Media> {
    return await db.transaction(async (trx) => {
      const existing = await Media.query({ client: trx })
        .where('entityType', 'user')
        .where('entityId', user.id)
        .where('kind', 'photo')
        .first()

      if (existing) {
        await this.cloudinary.deleteFile(existing.cloudinaryPublicId, 'image')
        await existing.useTransaction(trx).delete()
      }

      const uploaded = await this.cloudinary.uploadImage(file, folder)

      return await Media.create(
        {
          entityType: 'user',
          entityId: user.id,
          kind: 'photo',
          cloudinaryPublicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          originalFilename: uploaded.originalFilename,
          format: uploaded.format,
          bytes: uploaded.bytes,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
          position: 0,
          caption: null,
          uploadedById: user.id,
        },
        { client: trx }
      )
    })
  }

  private async nextPosition(entityType: MediaEntityType, entityId: number): Promise<number> {
    const result = await Media.query()
      .where('entityType', entityType)
      .where('entityId', entityId)
      .max('position as maxPosition')
      .first()

    const max = (result as unknown as { maxPosition: number | null })?.maxPosition
    return max === null || max === undefined ? 0 : max + 1
  }
}
