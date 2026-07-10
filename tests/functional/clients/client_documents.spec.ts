import { UserFactory } from '#database/factories/user_factory'
import { MediaFactory } from '#database/factories/media_factory'
import Client from '#models/client'
import Media from '#models/media'
import OrganizationMembership from '#models/organization_membership'
import { createAdminUser } from '#tests/functional/helpers'
import { CloudinaryService } from '#services/cloudinary_service'
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
  const deletedPublicIds: string[] = []
  const deletedFolders: string[] = []
  app.container.swap(
    CloudinaryService,
    () =>
      ({
        uploadDocument: async () => {
          const publicId = `fake-client-doc-${uploaded.length}`
          uploaded.push(publicId)
          return {
            publicId,
            url: `http://res.cloudinary.com/${publicId}.pdf`,
            secureUrl: `https://res.cloudinary.com/${publicId}.pdf`,
            format: 'pdf',
            resourceType: 'raw',
            bytes: 2048,
            originalFilename: 'permit',
          }
        },
        deleteFile: async (publicId: string) => {
          deletedPublicIds.push(publicId)
        },
        deleteFolder: async (folder: string) => {
          deletedFolders.push(folder)
        },
        downloadAsBuffer: async () => ({
          buffer: Buffer.from('%PDF-1.4 fake'),
          contentType: 'application/pdf',
        }),
      }) as unknown as CloudinaryService
  )
  return { uploaded, deletedPublicIds, deletedFolders }
}

test.group('Client documents (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('uploads a document attached to the client', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Alice',
        lastName: 'Martin',
        status: 'active',
      })

      const response = await client
        .post(`/clients/${record.id}/documents`)
        .loginAs(user)
        .file('files[]', Buffer.from('%PDF-1.4 fake'), {
          filename: 'permit.pdf',
          contentType: 'application/pdf',
        })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/clients/${record.id}`)

      const media = await Media.query()
        .where('entityType', 'client')
        .where('entityId', record.id)
        .firstOrFail()
      assert.equal(media.kind, 'document')
      assert.lengthOf(fake.uploaded, 1)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('uploads multiple documents attached to the client in one request', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Alice',
        lastName: 'Martin',
        status: 'active',
      })

      const response = await client
        .post(`/clients/${record.id}/documents`)
        .loginAs(user)
        .file('files[]', Buffer.from('%PDF-1.4 first'), {
          filename: 'permit.pdf',
          contentType: 'application/pdf',
        })
        .file('files[]', Buffer.from('%PDF-1.4 second'), {
          filename: 'id-card.pdf',
          contentType: 'application/pdf',
        })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/clients/${record.id}`)

      const medias = await Media.query().where('entityType', 'client').where('entityId', record.id)
      assert.lengthOf(medias, 2)
      assert.lengthOf(fake.uploaded, 2)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('lists documents on the client detail page', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const record = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Bob',
      lastName: 'Dylan',
      status: 'active',
    })
    await MediaFactory.merge({
      entityType: 'client',
      entityId: record.id,
      kind: 'document',
      format: 'pdf',
      originalFilename: 'id-card.pdf',
      caption: 'ID card',
    }).create()

    const response = await client.get(`/clients/${record.id}`).loginAs(user)

    response.assertStatus(200)
    assert.include(response.text(), 'ID card')
  })

  test('deletes a document (Cloudinary + row)', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Carla',
        lastName: 'Bruni',
        status: 'active',
      })
      const media = await MediaFactory.merge({
        entityType: 'client',
        entityId: record.id,
        kind: 'document',
      }).create()

      const response = await client
        .delete(`/clients/${record.id}/media/${media.id}`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/clients/${record.id}`)

      assert.isNull(await Media.find(media.id))
      assert.deepEqual(fake.deletedPublicIds, [media.cloudinaryPublicId])
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('cannot delete a document attached to another client (IDOR)', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const mine = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Mine',
        lastName: 'Client',
        status: 'active',
      })
      const other = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Other',
        lastName: 'Client',
        status: 'active',
      })
      const media = await MediaFactory.merge({
        entityType: 'client',
        entityId: other.id,
        kind: 'document',
      }).create()

      // Attacker passes their own client id but another client's media id
      const response = await client
        .delete(`/clients/${mine.id}/media/${media.id}`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(fake.deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('deleting a client cleans up its documents', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Gone',
        lastName: 'Client',
        status: 'active',
      })
      await MediaFactory.merge({
        entityType: 'client',
        entityId: record.id,
        kind: 'document',
      }).create()

      const response = await client.delete(`/clients/${record.id}`).loginAs(user).redirects(0)

      response.assertStatus(302)
      assert.isNull(await Client.find(record.id))

      const remaining = await Media.query()
        .where('entityType', 'client')
        .where('entityId', record.id)
        .count('* as total')
      assert.equal(Number(remaining[0].$extras.total), 0)
      assert.lengthOf(fake.deletedFolders, 1)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('non-enterprise org is blocked from uploading', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser() // 'pro' plan
      // A client id that would not resolve anyway; gating happens before lookup
      const response = await client
        .post('/clients/1/documents')
        .loginAs(user)
        .file('files[]', Buffer.from('%PDF-1.4 fake'), {
          filename: 'permit.pdf',
          contentType: 'application/pdf',
        })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/')
      assert.isEmpty(fake.uploaded)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('downloads a document', async ({ client }) => {
    swapFakeCloudinary()
    try {
      const user = await createEnterpriseAdminUser()
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Down',
        lastName: 'Load',
        status: 'active',
      })
      const media = await MediaFactory.merge({
        entityType: 'client',
        entityId: record.id,
        kind: 'document',
        format: 'pdf',
      }).create()

      const response = await client
        .get(`/clients/${record.id}/media/${media.id}/download`)
        .loginAs(user)

      response.assertStatus(200)
      response.assertHeader('content-type', 'application/pdf')
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('unauthenticated user is redirected to login', async ({ client }) => {
    const response = await client.post('/clients/1/documents').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
