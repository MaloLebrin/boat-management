import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import SettingsImportTab from '../../inertia/components/settings/tabs/SettingsImportTab.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', () => ({
  router: { post: vi.fn() },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

function mountTab(canImport: boolean) {
  return mount(SettingsImportTab, {
    props: {
      boats: [{ id: 1, name: 'Ariane' }],
      preview: null,
      hasPendingImport: false,
      canImport,
    },
  })
}

/**
 * `/settings/import` est l'écran Import **et** Export (#715) : les exports
 * s'arrêtent à `canExport` (Pro et Entreprise, tous rôles), seul l'import exige
 * le plan Entreprise et la capability `import.run`. Fermer la page entière
 * aurait donc retiré les exports à tous les comptes Pro et à tous les non-admins.
 */
describe('SettingsImportTab — section d’import gardée (#715)', () => {
  test('sans droit d’import : la section explique, le formulaire disparaît', () => {
    const w = mountTab(false)

    expect(w.text()).toContain('settings.import.restricted')
    expect(w.find('input[type="file"]').exists()).toBe(false)
    expect(w.text()).not.toContain('settings.import.previewButton')
  })

  test('les exports restent servis sans droit d’import', () => {
    const w = mountTab(false)

    expect(w.text()).toContain('settings.import.exportSection')
    expect(w.text()).toContain('settings.import.exportMaintenance')
  })

  test('avec le droit d’import : le formulaire est là, sans l’explication', () => {
    const w = mountTab(true)

    expect(w.find('input[type="file"]').exists()).toBe(true)
    expect(w.text()).toContain('settings.import.previewButton')
    expect(w.text()).not.toContain('settings.import.restricted')
  })
})
