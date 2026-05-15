import type { MultipartFile } from '@adonisjs/core/bodyparser'
import db from '@adonisjs/lucid/services/db'
import type { MediaEntityType, MediaKind } from '#shared/constants/media'
import Media from '#models/media'
import type User from '#models/user'
import { CloudinaryService } from '#services/cloudinary_service'

export class MediaNotFoundError extends Error {
  name = 'MediaNotFoundError'
}

export type UploadMediaPayload = {
  folder: string
  entityType: MediaEntityType
  entityId: number
  kind: MediaKind
  caption?: string | null
}

function resourceTypeFromKind(kind: MediaKind): 'image' | 'raw' {
  return kind === 'photo' ? 'image' : 'raw'
}

export default class MediaService {
  private cloudinary = new CloudinaryService()

  async upload(user: User, file: MultipartFile, payload: UploadMediaPayload): Promise<Media> {
    const resourceType = resourceTypeFromKind(payload.kind)

    const uploaded =
      resourceType === 'image'
        ? await this.cloudinary.uploadImage(file, payload.folder)
        : await this.cloudinary.uploadDocument(file, payload.folder)

    const position = await this.nextPosition(payload.entityType, payload.entityId)

    return await Media.create({
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
  }

  async listForEntity(entityType: MediaEntityType, entityId: number): Promise<Media[]> {
    return await Media.query()
      .where('entityType', entityType)
      .where('entityId', entityId)
      .orderBy('position', 'asc')
  }

  async deleteById(mediaId: number): Promise<void> {
    const media = await Media.find(mediaId)
    if (!media) throw new MediaNotFoundError()

    await this.cloudinary.deleteFile(media.cloudinaryPublicId, resourceTypeFromKind(media.kind))
    await media.delete()
  }

  async deleteAllForEntity(
    entityType: MediaEntityType,
    entityId: number,
    folderPath: string
  ): Promise<void> {
    await Media.query().where('entityType', entityType).where('entityId', entityId).delete()

    try {
      await this.cloudinary.deleteFolder(folderPath)
    } catch {
      // folder may not exist if no files were ever uploaded
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
