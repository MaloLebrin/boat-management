import Media from '#models/media'
import type { MediaEntityType, MediaKind } from '#shared/constants/media'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

export const MediaFactory = Factory.define(Media, ({ faker }: FactoryContextContract) => ({
  entityType: 'boat' as MediaEntityType,
  entityId: faker.number.int({ min: 1, max: 1000 }),
  kind: 'photo' as MediaKind,
  cloudinaryPublicId: 'test/' + faker.string.uuid(),
  secureUrl: faker.image.url(),
  originalFilename: faker.system.fileName() + '.jpg',
  format: 'jpg',
  bytes: faker.number.int({ min: 10000, max: 5000000 }),
  width: 1920,
  height: 1080,
  position: 0,
  caption: null,
  uploadedById: null,
})).build()
