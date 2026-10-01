import { readFileSync } from 'node:fs'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { PWA_SCREENSHOTS, PWA_SHORTCUTS } from '#shared/constants/pwa'
import type { WebAppManifest } from '#shared/types/pwa'

function readManifest(body: string): WebAppManifest {
  return JSON.parse(body) as WebAppManifest
}

function pngSize(publicPath: string): { width: number; height: number } {
  const buffer = readFileSync(app.publicPath(publicPath.replace(/^\//, '')))
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

test.group('GET /site.webmanifest (#865)', () => {
  test('sert un manifeste JSON avec id, scope, start_url et quatre raccourcis', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/site.webmanifest').header('Accept-Language', 'fr')

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'application/manifest+json')

    const manifest = readManifest(response.text())
    assert.equal(manifest.id, '/')
    assert.equal(manifest.scope, '/')
    assert.equal(manifest.start_url, '/dashboard?source=pwa')
    assert.equal(manifest.lang, 'fr')
    assert.isAtLeast(manifest.shortcuts.length, 4)
    assert.deepEqual(
      manifest.shortcuts.map((shortcut) => shortcut.url),
      PWA_SHORTCUTS.map((shortcut) => shortcut.path)
    )

    for (const shortcut of manifest.shortcuts) {
      const path = new URL(shortcut.url, 'http://localhost').pathname
      const page = await client.get(path)
      assert.notEqual(page.status(), 404, `${path} n'est pas une route`)
    }
  })

  test('la langue suit Accept-Language', async ({ client, assert }) => {
    const frResponse = await client.get('/site.webmanifest').header('Accept-Language', 'fr')
    const enResponse = await client.get('/site.webmanifest').header('Accept-Language', 'en')
    const fr = readManifest(frResponse.text())
    const en = readManifest(enResponse.text())

    assert.equal(fr.lang, 'fr')
    assert.equal(en.lang, 'en')
    assert.equal(fr.shortcuts[2].name, 'Signaler un incident')
    assert.equal(en.shortcuts[2].name, 'Report an incident')
  })

  test('les captures ont les dimensions annoncées', ({ assert }) => {
    for (const screenshot of PWA_SCREENSHOTS) {
      const [width, height] = screenshot.sizes.split('x').map(Number)
      assert.deepEqual(pngSize(screenshot.src), { width, height })
    }
  })
})
