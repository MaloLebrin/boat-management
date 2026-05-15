import type Media from '#models/media'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class MediaTransformer extends BaseTransformer<Media> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'entityType',
      'entityId',
      'kind',
      'secureUrl',
      'cloudinaryPublicId',
      'originalFilename',
      'format',
      'bytes',
      'width',
      'height',
      'position',
      'caption',
      'uploadedById',
      'createdAt',
    ])
  }
}
