import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import MediaTransformer from '#transformers/media_transformer'
import type Media from '#models/media'

function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    entityType: 'boat',
    entityId: 10,
    kind: 'photo',
    cloudinaryPublicId: 'boats/abc123',
    secureUrl: 'https://res.cloudinary.com/test/image/upload/boats/abc123.jpg',
    originalFilename: 'boat.jpg',
    format: 'jpg',
    bytes: 204800,
    width: 1920,
    height: 1080,
    position: 0,
    caption: 'Main photo',
    uploadedById: 5,
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z'),
    ...overrides,
  } as unknown as Media
}

test.group('MediaTransformer', () => {
  test('toObject returns all picked keys', ({ assert }) => {
    const media = makeMedia()
    const result = new MediaTransformer(media).toObject()

    assert.equal(result.id, 1)
    assert.equal(result.entityType, 'boat')
    assert.equal(result.entityId, 10)
    assert.equal(result.kind, 'photo')
    assert.equal(result.secureUrl, 'https://res.cloudinary.com/test/image/upload/boats/abc123.jpg')
    assert.equal(result.originalFilename, 'boat.jpg')
    assert.equal(result.format, 'jpg')
    assert.equal(result.bytes, 204800)
    assert.equal(result.width, 1920)
    assert.equal(result.height, 1080)
    assert.equal(result.position, 0)
    assert.equal(result.caption, 'Main photo')
    assert.equal(result.uploadedById, 5)
  })

  test('cloudinaryPublicId is not included in picked keys', ({ assert }) => {
    const media = makeMedia()
    const result = new MediaTransformer(media).toObject()
    assert.notProperty(result, 'cloudinaryPublicId')
  })

  test('nullable fields width, height, caption, uploadedById can be null', ({ assert }) => {
    const media = makeMedia({
      width: null,
      height: null,
      caption: null,
      uploadedById: null,
    })
    const result = new MediaTransformer(media).toObject()

    assert.isNull(result.width)
    assert.isNull(result.height)
    assert.isNull(result.caption)
    assert.isNull(result.uploadedById)
  })

  test('createdAt DateTime is preserved as-is', ({ assert }) => {
    const dt = DateTime.fromISO('2026-07-04T10:00:00.000Z')
    const media = makeMedia({ createdAt: dt })
    const result = new MediaTransformer(media).toObject()
    assert.deepEqual(result.createdAt, dt)
  })
})
