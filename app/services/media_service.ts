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
    // exceed the limit. If file.size is 0 (unknown at parse time) the guard is skipped — the
    // post-upload increment in updateStorageUsed still runs, so the quota counter stays correct.
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

  async deleteForEntity(
    mediaId: number,
    entityType: MediaEntityType,
    entityId: number,
    org: Organization | null
  ): Promise<void> {
    const media = await Media.query()
      .where('id', mediaId)
      .where('entityType', entityType)
      .where('entityId', entityId)
      .first()
    if (!media) throw new MediaNotFoundError()

    if (org === null && media.entityType !== 'user') {
      logger.warn(
        { mediaId, entityType: media.entityType },
        'MediaService.deleteForEntity called without org — storage quota not decremented'
      )
    }

    const bytes = media.bytes ?? 0

    await this.cloudinary.deleteFile(
      media.cloudinaryPublicId,
      resourceTypeFromKind(media.kind, media.format)
    )
    await media.delete()

    if (org !== null) {
      await this.quotaService.updateStorageUsed(org, -bytes)
    }
  }

  async deleteAllForEntity(
    entityType: MediaEntityType,
    entityId: number,
    folderPath: string,
    org: Organization | null
  ): Promise<void> {
    if (org === null) {
      logger.warn(
        { entityType, entityId },
        'MediaService.deleteAllForEntity called without org — storage quota not decremented'
      )
    }

    const totalBytes = await db.transaction(async (trx) => {
      const medias = await Media.query({ client: trx })
        .where('entityType', entityType)
        .where('entityId', entityId)
        .select('bytes')
      const bytes = medias.reduce((sum, m) => sum + (m.bytes ?? 0), 0)
      await Media.query({ client: trx })
        .where('entityType', entityType)
        .where('entityId', entityId)
        .delete()
      return bytes
    })

    try {
      await this.cloudinary.deleteFolder(folderPath)
    } catch (err) {
      // Folder may not exist if no files were ever uploaded. Any other Cloudinary error (e.g.
      // transient 5xx) is logged at warn level so it doesn't silently corrupt the quota counter —
      // files would remain on Cloudinary while quota was already decremented above.
      logger.warn(
        { folderPath, err },
        'MediaService.deleteAllForEntity: Cloudinary deleteFolder failed'
      )
    }

    if (org !== null && totalBytes > 0) {
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
