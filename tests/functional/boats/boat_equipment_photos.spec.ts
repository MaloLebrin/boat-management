import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatGenericEquipmentFactory } from '#database/factories/boat_generic_equipment_factory'
import { BoatRigFactory } from '#database/factories/boat_rig_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { UserFactory } from '#database/factories/user_factory'
import Media from '#models/media'
import OrganizationMembership from '#models/organization_membership'
import type User from '#models/user'
import { CloudinaryService } from '#services/cloudinary_service'
import type { MediaEntityType } from '#shared/constants/media'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

async function createEnterpriseAdminUser() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

function swapFakeCloudinary() {
  const uploaded: string[] = []
  const uploadedFolders: string[] = []
  const deletedPublicIds: string[] = []
  const deletedFolders: string[] = []
  app.container.swap(
    CloudinaryService,
    () =>
      ({
        uploadImage: async (_file: unknown, folder: string) => {
          const publicId = `fake-photo-${uploaded.length}`
          uploaded.push(publicId)
          uploadedFolders.push(folder)
          return {
            publicId,
            url: `http://res.cloudinary.com/${publicId}.jpg`,
            secureUrl: `https://res.cloudinary.com/${publicId}.jpg`,
            format: 'jpg',
            resourceType: 'image',
            bytes: 1024,
            originalFilename: 'photo',
            width: 800,
            height: 600,
          }
        },
        deleteFile: async (publicId: string) => {
          deletedPublicIds.push(publicId)
        },
        deleteFolder: async (folder: string) => {
          deletedFolders.push(folder)
        },
      }) as unknown as CloudinaryService
  )
  return { uploaded, uploadedFolders, deletedPublicIds, deletedFolders }
}

function photoBuffer() {
  return Buffer.from('\xff\xd8\xff\xe0 fake jpeg', 'binary')
}

/** A valid-magic JPEG buffer padded to roughly `mb` megabytes. */
function largePhotoBuffer(mb: number) {
  return Buffer.concat([photoBuffer(), Buffer.alloc(mb * 1024 * 1024)])
}

/** Builds a boat owned by `user` with one of every equipment kind attached. */
async function seedEquipment(user: User) {
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
  const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()
  const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()
  const rig = await BoatRigFactory.merge({ boatId: boat.id }).create()
  const generic = await BoatGenericEquipmentFactory.merge({ boatId: boat.id }).create()
  const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()
  return { boat, engine, part, sail, rig, generic, safety }
}

type Seed = Awaited<ReturnType<typeof seedEquipment>>

interface EquipmentCase {
  name: string
  entityType: MediaEntityType
  entityId: (s: Seed) => number
  photosUrl: (s: Seed) => string
  uploadUrl: (s: Seed) => string
  deleteUrl: (s: Seed, mediaId: number) => string
}

const CASES: EquipmentCase[] = [
  {
    name: 'engine',
    entityType: 'boat_engine',
    entityId: (s) => s.engine.id,
    photosUrl: (s) => `/boats/${s.boat.id}/engines/${s.engine.id}?tab=photos`,
    uploadUrl: (s) => `/boats/${s.boat.id}/engines/${s.engine.id}/photos`,
    deleteUrl: (s, m) => `/boats/${s.boat.id}/engines/${s.engine.id}/photos/${m}`,
  },
  {
    name: 'engine part',
    entityType: 'boat_engine_part',
    entityId: (s) => s.part.id,
    photosUrl: (s) => `/boats/${s.boat.id}/engines/${s.engine.id}/parts/${s.part.id}?tab=photos`,
    uploadUrl: (s) => `/boats/${s.boat.id}/engines/${s.engine.id}/parts/${s.part.id}/photos`,
    deleteUrl: (s, m) =>
      `/boats/${s.boat.id}/engines/${s.engine.id}/parts/${s.part.id}/photos/${m}`,
  },
  {
    name: 'sail',
    entityType: 'boat_sail',
    entityId: (s) => s.sail.id,
    photosUrl: (s) => `/boats/${s.boat.id}/sails/${s.sail.id}?tab=photos`,
    uploadUrl: (s) => `/boats/${s.boat.id}/sails/${s.sail.id}/photos`,
    deleteUrl: (s, m) => `/boats/${s.boat.id}/sails/${s.sail.id}/photos/${m}`,
  },
  {
    name: 'rig',
    entityType: 'boat_rig',
    entityId: (s) => s.rig.id,
    photosUrl: (s) => `/boats/${s.boat.id}/rig?tab=photos`,
    uploadUrl: (s) => `/boats/${s.boat.id}/rig/photos`,
    deleteUrl: (s, m) => `/boats/${s.boat.id}/rig/photos/${m}`,
  },
  {
    name: 'generic equipment',
    entityType: 'boat_generic_equipment',
    entityId: (s) => s.generic.id,
    photosUrl: (s) => `/boats/${s.boat.id}/generic-equipment/${s.generic.id}?tab=photos`,
    uploadUrl: (s) => `/boats/${s.boat.id}/generic-equipment/${s.generic.id}/photos`,
    deleteUrl: (s, m) => `/boats/${s.boat.id}/generic-equipment/${s.generic.id}/photos/${m}`,
  },
  {
    name: 'safety equipment',
    entityType: 'boat_safety_equipment',
    entityId: (s) => s.safety.id,
    photosUrl: (s) => `/boats/${s.boat.id}/safety-equipment/${s.safety.id}?tab=photos`,
    uploadUrl: (s) => `/boats/${s.boat.id}/safety-equipment/${s.safety.id}/photos`,
    deleteUrl: (s, m) => `/boats/${s.boat.id}/safety-equipment/${s.safety.id}/photos/${m}`,
  },
]

test.group('Equipment photos — upload (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  for (const c of CASES) {
    test(`POST attaches a photo to the ${c.name}`, async ({ client, assert }) => {
      const fake = swapFakeCloudinary()
      try {
        const user = await createEnterpriseAdminUser()
        const seed = await seedEquipment(user)

        const response = await client
          .post(c.uploadUrl(seed))
          .loginAs(user)
          .file('files[]', photoBuffer(), { filename: 'photo.jpg', contentType: 'image/jpeg' })
          .redirects(0)

        response.assertStatus(302)
        response.assertHeader('location', c.photosUrl(seed))

        const media = await Media.query()
          .where('entityType', c.entityType)
          .where('entityId', c.entityId(seed))
          .firstOrFail()

        assert.equal(media.kind, 'photo')
        assert.lengthOf(fake.uploaded, 1)
        // The photo lands in the entity's own `photos/` folder, not a sibling's.
        assert.match(fake.uploadedFolders[0], /\/photos$/)
      } finally {
        app.container.restore(CloudinaryService)
      }
    })

    test(`POST attaches multiple photos to the ${c.name} in one request`, async ({
      client,
      assert,
    }) => {
      const fake = swapFakeCloudinary()
      try {
        const user = await createEnterpriseAdminUser()
        const seed = await seedEquipment(user)

        const response = await client
          .post(c.uploadUrl(seed))
          .loginAs(user)
          .file('files[]', photoBuffer(), { filename: 'photo-1.jpg', contentType: 'image/jpeg' })
          .file('files[]', photoBuffer(), { filename: 'photo-2.jpg', contentType: 'image/jpeg' })
          .file('files[]', photoBuffer(), { filename: 'photo-3.jpg', contentType: 'image/jpeg' })
          .redirects(0)

        response.assertStatus(302)
        response.assertHeader('location', c.photosUrl(seed))

        const medias = await Media.query()
          .where('entityType', c.entityType)
          .where('entityId', c.entityId(seed))
          .orderBy('position', 'asc')

        assert.lengthOf(medias, 3)
        assert.deepEqual(
          medias.map((m) => m.position),
          [0, 1, 2]
        )
        assert.lengthOf(fake.uploaded, 3)
      } finally {
        app.container.restore(CloudinaryService)
      }
    })
  }

  test('POST accepts a batch whose total size exceeds the base multipart limit', async ({
    client,
  }) => {
    // Three ~8mb photos = ~24mb total, above the base 20mb multipart limit but well
    // under LARGE_UPLOAD_LIMIT (400mb). This only succeeds because the batch route is
    // scoped out of the base limit (processManually + LargeMultipartUploadMiddleware);
    // otherwise the request would abort with 413 during streaming.
    const c = CASES[0]
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const seed = await seedEquipment(user)

      const response = await client
        .post(c.uploadUrl(seed))
        .loginAs(user)
        .file('files[]', largePhotoBuffer(8), { filename: 'big-1.jpg', contentType: 'image/jpeg' })
        .file('files[]', largePhotoBuffer(8), { filename: 'big-2.jpg', contentType: 'image/jpeg' })
        .file('files[]', largePhotoBuffer(8), { filename: 'big-3.jpg', contentType: 'image/jpeg' })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', c.photosUrl(seed))
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('POST keeps successful uploads when one file in the batch fails', async ({
    client,
    assert,
  }) => {
    const c = CASES[0]
    let callCount = 0
    app.container.swap(
      CloudinaryService,
      () =>
        ({
          uploadImage: async (_file: unknown, folder: string) => {
            callCount += 1
            if (callCount === 2) throw new Error('Cloudinary upload failed')
            return {
              publicId: `fake-photo-${callCount}`,
              url: `http://res.cloudinary.com/fake-photo-${callCount}.jpg`,
              secureUrl: `https://res.cloudinary.com/fake-photo-${callCount}.jpg`,
              format: 'jpg',
              resourceType: 'image',
              bytes: 1024,
              originalFilename: 'photo',
              width: 800,
              height: 600,
              folder,
            }
          },
          deleteFile: async () => {},
          deleteFolder: async () => {},
        }) as unknown as CloudinaryService
    )

    try {
      const user = await createEnterpriseAdminUser()
      const seed = await seedEquipment(user)

      const response = await client
        .post(c.uploadUrl(seed))
        .loginAs(user)
        .file('files[]', photoBuffer(), { filename: 'photo-1.jpg', contentType: 'image/jpeg' })
        .file('files[]', photoBuffer(), { filename: 'photo-2.jpg', contentType: 'image/jpeg' })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', c.photosUrl(seed))

      const medias = await Media.query()
        .where('entityType', c.entityType)
        .where('entityId', c.entityId(seed))

      assert.lengthOf(medias, 1)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('POST redirects to /login when unauthenticated', async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const seed = await seedEquipment(user)

    const response = await client
      .post(CASES[0].uploadUrl(seed))
      .file('files[]', photoBuffer(), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})

test.group('Equipment photos — delete (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  for (const c of CASES) {
    test(`DELETE removes the ${c.name} photo and purges Cloudinary`, async ({ client, assert }) => {
      const fake = swapFakeCloudinary()
      try {
        const user = await createEnterpriseAdminUser()
        const seed = await seedEquipment(user)
        const media = await MediaFactory.merge({
          entityType: c.entityType,
          entityId: c.entityId(seed),
          uploadedById: user.id,
          kind: 'photo',
        }).create()

        const response = await client.delete(c.deleteUrl(seed, media.id)).loginAs(user).redirects(0)

        response.assertStatus(302)
        response.assertHeader('location', c.photosUrl(seed))

        assert.isNull(await Media.find(media.id))
        assert.deepEqual(fake.deletedPublicIds, [media.cloudinaryPublicId])
      } finally {
        app.container.restore(CloudinaryService)
      }
    })
  }

  test('DELETE redirects to /login when unauthenticated', async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const seed = await seedEquipment(user)

    const response = await client.delete(CASES[0].deleteUrl(seed, 999)).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})

test.group('Equipment photos — IDOR (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('engine of another boat is rejected', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const victim = await createEnterpriseAdminUser()
      const attacker = await createEnterpriseAdminUser()
      const victimSeed = await seedEquipment(victim)
      const attackerSeed = await seedEquipment(attacker)

      const media = await MediaFactory.merge({
        entityType: 'boat_engine',
        entityId: victimSeed.engine.id,
        kind: 'photo',
      }).create()

      const response = await client
        .delete(`/boats/${attackerSeed.boat.id}/engines/${victimSeed.engine.id}/photos/${media.id}`)
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${attackerSeed.boat.id}`)

      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(fake.deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('engine part of another engine is rejected', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const seed = await seedEquipment(user)
      const otherEngine = await BoatEngineFactory.merge({ boatId: seed.boat.id }).create()

      const media = await MediaFactory.merge({
        entityType: 'boat_engine_part',
        entityId: seed.part.id,
        kind: 'photo',
      }).create()

      // `part` belongs to seed.engine, not to otherEngine.
      const response = await client
        .delete(
          `/boats/${seed.boat.id}/engines/${otherEngine.id}/parts/${seed.part.id}/photos/${media.id}`
        )
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader(
        'location',
        `/boats/${seed.boat.id}/engines/${otherEngine.id}?tab=parts`
      )

      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(fake.deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('sail of another boat is rejected', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const victim = await createEnterpriseAdminUser()
      const attacker = await createEnterpriseAdminUser()
      const victimSeed = await seedEquipment(victim)
      const attackerSeed = await seedEquipment(attacker)

      const media = await MediaFactory.merge({
        entityType: 'boat_sail',
        entityId: victimSeed.sail.id,
        kind: 'photo',
      }).create()

      const response = await client
        .delete(`/boats/${attackerSeed.boat.id}/sails/${victimSeed.sail.id}/photos/${media.id}`)
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${attackerSeed.boat.id}`)

      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(fake.deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test("rig: the victim's mediaId on the attacker's own rig is rejected", async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const victim = await createEnterpriseAdminUser()
      const attacker = await createEnterpriseAdminUser()
      const victimSeed = await seedEquipment(victim)
      const attackerSeed = await seedEquipment(attacker)

      // Media belongs to the victim's rig; the attacker hits their own rig route.
      const media = await MediaFactory.merge({
        entityType: 'boat_rig',
        entityId: victimSeed.rig.id,
        kind: 'photo',
      }).create()

      const response = await client
        .delete(`/boats/${attackerSeed.boat.id}/rig/photos/${media.id}`)
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      // getForEntity scopes to the attacker's own rig id → no match → bounce back.
      response.assertHeader('location', `/boats/${attackerSeed.boat.id}/rig?tab=photos`)

      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(fake.deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('generic equipment of another boat is rejected', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const victim = await createEnterpriseAdminUser()
      const attacker = await createEnterpriseAdminUser()
      const victimSeed = await seedEquipment(victim)
      const attackerSeed = await seedEquipment(attacker)

      const media = await MediaFactory.merge({
        entityType: 'boat_generic_equipment',
        entityId: victimSeed.generic.id,
        kind: 'photo',
      }).create()

      const response = await client
        .delete(
          `/boats/${attackerSeed.boat.id}/generic-equipment/${victimSeed.generic.id}/photos/${media.id}`
        )
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${attackerSeed.boat.id}?tab=equipment`)

      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(fake.deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('safety equipment of another boat is rejected', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const victim = await createEnterpriseAdminUser()
      const attacker = await createEnterpriseAdminUser()
      const victimSeed = await seedEquipment(victim)
      const attackerSeed = await seedEquipment(attacker)

      const media = await MediaFactory.merge({
        entityType: 'boat_safety_equipment',
        entityId: victimSeed.safety.id,
        kind: 'photo',
      }).create()

      const response = await client
        .delete(
          `/boats/${attackerSeed.boat.id}/safety-equipment/${victimSeed.safety.id}/photos/${media.id}`
        )
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${attackerSeed.boat.id}?tab=equipment`)

      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(fake.deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('uploading to another boat’s engine is rejected', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const victim = await createEnterpriseAdminUser()
      const attacker = await createEnterpriseAdminUser()
      const victimSeed = await seedEquipment(victim)
      const attackerSeed = await seedEquipment(attacker)

      const response = await client
        .post(`/boats/${attackerSeed.boat.id}/engines/${victimSeed.engine.id}/photos`)
        .loginAs(attacker)
        .file('files[]', photoBuffer(), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${attackerSeed.boat.id}`)

      assert.isEmpty(fake.uploaded)
      const count = await Media.query().where('entityType', 'boat_engine').count('* as total')
      assert.equal(Number(count[0].$extras.total), 0)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })
})

test.group('Equipment photos — cleanup on delete (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('deleting a sail purges its photos', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const seed = await seedEquipment(user)
      const media = await MediaFactory.merge({
        entityType: 'boat_sail',
        entityId: seed.sail.id,
        kind: 'photo',
      }).create()

      await client.delete(`/boats/${seed.boat.id}/sails/${seed.sail.id}`).loginAs(user).redirects(0)

      assert.isNull(await Media.find(media.id))
      assert.isNotEmpty(fake.deletedFolders)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('deleting the rig purges its photos', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const seed = await seedEquipment(user)
      const media = await MediaFactory.merge({
        entityType: 'boat_rig',
        entityId: seed.rig.id,
        kind: 'photo',
      }).create()

      await client.delete(`/boats/${seed.boat.id}/rig`).loginAs(user).redirects(0)

      assert.isNull(await Media.find(media.id))
      assert.isNotEmpty(fake.deletedFolders)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('deleting a generic equipment item purges its photos', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const seed = await seedEquipment(user)
      const media = await MediaFactory.merge({
        entityType: 'boat_generic_equipment',
        entityId: seed.generic.id,
        kind: 'photo',
      }).create()

      await client
        .delete(`/boats/${seed.boat.id}/generic-equipment/${seed.generic.id}`)
        .loginAs(user)
        .redirects(0)

      assert.isNull(await Media.find(media.id))
      assert.isNotEmpty(fake.deletedFolders)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('deleting a safety equipment item purges its photos', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const seed = await seedEquipment(user)
      const media = await MediaFactory.merge({
        entityType: 'boat_safety_equipment',
        entityId: seed.safety.id,
        kind: 'photo',
      }).create()

      await client
        .delete(`/boats/${seed.boat.id}/safety-equipment/${seed.safety.id}`)
        .loginAs(user)
        .redirects(0)

      assert.isNull(await Media.find(media.id))
      assert.isNotEmpty(fake.deletedFolders)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('deleting the boat purges generic and safety equipment photos', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const seed = await seedEquipment(user)

      const genericMedia = await MediaFactory.merge({
        entityType: 'boat_generic_equipment',
        entityId: seed.generic.id,
        kind: 'photo',
      }).create()
      const safetyMedia = await MediaFactory.merge({
        entityType: 'boat_safety_equipment',
        entityId: seed.safety.id,
        kind: 'photo',
      }).create()

      await client.delete(`/boats/${seed.boat.id}`).loginAs(user).redirects(0)

      assert.isNull(await Media.find(genericMedia.id))
      assert.isNull(await Media.find(safetyMedia.id))
      assert.isNotEmpty(fake.deletedFolders)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('deleting an engine part purges its photos, not just its documents', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const seed = await seedEquipment(user)
      const photo = await MediaFactory.merge({
        entityType: 'boat_engine_part',
        entityId: seed.part.id,
        kind: 'photo',
      }).create()
      const doc = await MediaFactory.merge({
        entityType: 'boat_engine_part',
        entityId: seed.part.id,
        kind: 'document',
      }).create()

      await client
        .delete(`/boats/${seed.boat.id}/engines/${seed.engine.id}/parts/${seed.part.id}`)
        .loginAs(user)
        .redirects(0)

      assert.isNull(await Media.find(photo.id))
      assert.isNull(await Media.find(doc.id))
      // The purged folder is the part root, so both `photos/` and `documents/` go with it.
      assert.isTrue(fake.deletedFolders.some((f) => f.endsWith(`/parts/${seed.part.id}`)))
    } finally {
      app.container.restore(CloudinaryService)
    }
  })
})
