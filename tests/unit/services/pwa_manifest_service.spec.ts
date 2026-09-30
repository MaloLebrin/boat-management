import { test } from '@japa/runner'
import i18nManager from '@adonisjs/i18n/services/main'
import PwaManifestService from '#services/pwa_manifest_service'
import { PWA_ID, PWA_SCOPE, PWA_SHORTCUTS, PWA_START_URL } from '#shared/constants/pwa'

const service = new PwaManifestService()

test.group('PwaManifestService (#865)', () => {
  test('identifie l’app indépendamment du start_url et liste les quatre raccourcis', ({
    assert,
  }) => {
    const manifest = service.build(i18nManager.locale('fr'))

    assert.equal(manifest.id, PWA_ID)
    assert.equal(manifest.scope, PWA_SCOPE)
    assert.equal(manifest.start_url, PWA_START_URL)
    assert.equal(manifest.lang, 'fr')
    assert.equal(manifest.orientation, 'any')
    assert.deepEqual(manifest.categories, ['productivity', 'business'])
    assert.lengthOf(manifest.shortcuts, PWA_SHORTCUTS.length)
    assert.deepEqual(
      manifest.shortcuts.map((shortcut) => shortcut.url),
      PWA_SHORTCUTS.map((shortcut) => shortcut.path)
    )
    assert.equal(manifest.shortcuts[0].name, 'Nouvelle sortie')
    assert.equal(manifest.shortcuts[0].icons[0].sizes, '96x96')
    assert.lengthOf(manifest.screenshots, 2)
  })

  test('la description et les raccourcis suivent la locale', ({ assert }) => {
    const fr = service.build(i18nManager.locale('fr'))
    const en = service.build(i18nManager.locale('en'))

    assert.equal(en.lang, 'en')
    assert.notEqual(fr.description, en.description)
    assert.equal(en.shortcuts[0].name, 'New trip')
    assert.equal(fr.name, 'FleetAi')
    assert.equal(en.name, 'FleetAi')
  })
})
