import { test } from '@japa/runner'
import { isMaintenanceEnabled, renderMaintenancePage } from '#services/maintenance_mode'
import en from '../../../resources/lang/en/errors.json' with { type: 'json' }
import fr from '../../../resources/lang/fr/errors.json' with { type: 'json' }

test.group('Maintenance mode (#864)', () => {
  test('is enabled when the env flag or the file flag is set', ({ assert }) => {
    assert.isFalse(isMaintenanceEnabled(false, false))
    assert.isTrue(isMaintenanceEnabled(true, false))
    assert.isTrue(isMaintenanceEnabled(false, true))
    assert.isTrue(isMaintenanceEnabled(true, true))
  })

  test('the static page carries both locales and no Inertia payload', ({ assert }) => {
    const html = renderMaintenancePage()

    assert.include(html, en.maintenance.title)
    assert.include(html, fr.maintenance.title)
    assert.include(html, en.maintenance.description)
    assert.include(html, fr.maintenance.description)
    assert.include(html, 'window.location.reload()')
    assert.notInclude(html, 'data-page')
    assert.notInclude(html, 'errors/maintenance')
  })
})
