import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import AiService from '#services/ai_service'
import { CloudinaryService } from '#services/cloudinary_service'
import {
  restoreAiService,
  restoreCloudinary,
  swapAiService,
  swapFakeCloudinary,
} from '#tests/support/fakes'

/** Fichier multipart minimal — le fake n'en lit que le dossier cible. */
const FILE = { tmpPath: '/tmp/fake', clientName: 'photo.jpg', extname: 'jpg' } as never

test.group('tests/support/fakes — swapFakeCloudinary', (group) => {
  group.each.teardown(() => restoreCloudinary())

  test('captures uploads with their folder and returns a plausible result', async ({ assert }) => {
    const fake = swapFakeCloudinary({ prefix: 'unit' })
    const service = await app.container.make(CloudinaryService)

    const image = await service.uploadImage(FILE, 'org/boats/1/photos')
    const doc = await service.uploadDocument(FILE, 'org/boats/1/documents')

    assert.deepEqual(fake.uploaded, ['unit-0', 'unit-1'])
    assert.deepEqual(fake.uploadedFolders, ['org/boats/1/photos', 'org/boats/1/documents'])
    assert.equal(image.resourceType, 'image')
    assert.equal(image.format, 'jpg')
    assert.equal(image.width, 800)
    assert.equal(doc.resourceType, 'raw')
    assert.equal(doc.format, 'pdf')
    assert.match(doc.secureUrl, /^https:\/\/res\.cloudinary\.com\/unit-1\.pdf$/)
  })

  test('failUploadAt makes the nth upload throw without recording it', async ({ assert }) => {
    const fake = swapFakeCloudinary({ failUploadAt: 2 })
    const service = await app.container.make(CloudinaryService)

    await service.uploadImage(FILE, 'a')
    await assert.rejects(() => service.uploadImage(FILE, 'b'), 'Cloudinary upload failed')
    await service.uploadDocument(FILE, 'c')

    assert.deepEqual(fake.uploadedFolders, ['a', 'c'])
  })

  test('records deletions (files with resource type, and folders)', async ({ assert }) => {
    const fake = swapFakeCloudinary()
    const service = await app.container.make(CloudinaryService)

    await service.deleteFile('pid-1')
    await service.deleteFile('pid-2', 'raw')
    await service.deleteFolder('org/boats/1')

    assert.deepEqual(fake.deletedPublicIds, ['pid-1', 'pid-2'])
    assert.deepEqual(fake.deletedFiles, [
      { publicId: 'pid-1', resourceType: 'image' },
      { publicId: 'pid-2', resourceType: 'raw' },
    ])
    assert.deepEqual(fake.deletedFolders, ['org/boats/1'])
  })

  test('downloadAsBuffer returns a minimal PDF', async ({ assert }) => {
    swapFakeCloudinary()
    const service = await app.container.make(CloudinaryService)

    const { buffer, contentType } = await service.downloadAsBuffer('pid', 'raw', 'pdf')

    assert.equal(contentType, 'application/pdf')
    assert.isTrue(buffer.toString().startsWith('%PDF-'))
  })

  test('restore() puts the real service back', async ({ assert }) => {
    const fake = swapFakeCloudinary()
    assert.notInstanceOf(await app.container.make(CloudinaryService), CloudinaryService)

    fake.restore()

    assert.instanceOf(await app.container.make(CloudinaryService), CloudinaryService)
  })
})

test.group('tests/support/fakes — swapAiService', (group) => {
  group.each.teardown(() => restoreAiService())

  test('captures every call with its options and plays the script in order', async ({ assert }) => {
    const calls = swapAiService(
      ['first', { content: 'second', toolCalls: [{ id: 't1', name: 'lookup', arguments: {} }] }],
      7
    )
    const service = await app.container.make(AiService)

    const one = await service.chat([{ role: 'user', content: 'hello' }], {
      provider: 'anthropic',
      model: 'claude',
      apiKey: 'sk-test',
      tools: [{ name: 'lookup', description: 'd', parameters: {} }],
    })
    const two = await service.chat([{ role: 'user', content: 'again' }])
    const three = await service.chat([{ role: 'user', content: 'and again' }])

    assert.equal(one.content, 'first')
    assert.deepEqual(one.toolCalls, [])
    assert.equal(one.tokensUsed, 7)
    assert.equal(two.content, 'second')
    assert.lengthOf(two.toolCalls, 1)
    // La dernière réponse du script est répétée.
    assert.equal(three.content, 'second')

    assert.lengthOf(calls, 3)
    assert.equal(calls[0].messages[0].content, 'hello')
    assert.equal(calls[0].provider, 'anthropic')
    assert.equal(calls[0].model, 'claude')
    assert.equal(calls[0].apiKey, 'sk-test')
    assert.equal(calls[0].tools?.[0].name, 'lookup')
    assert.isNull(calls[1].provider)
    assert.isNull(calls[1].tools)
  })

  test('a plain string script is a single tool-less turn', async ({ assert }) => {
    swapAiService('only answer')
    const service = await app.container.make(AiService)

    const result = await service.chat([{ role: 'user', content: 'q' }])

    assert.equal(result.content, 'only answer')
    assert.deepEqual(result.toolCalls, [])
    assert.equal(result.tokensUsed, 42)
  })

  test('restoreAiService() puts the real service back', async ({ assert }) => {
    swapAiService('x')
    assert.notInstanceOf(await app.container.make(AiService), AiService)

    restoreAiService()

    assert.instanceOf(await app.container.make(AiService), AiService)
  })
})
