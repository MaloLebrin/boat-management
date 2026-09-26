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

const fleet = [
  { id: 1, name: 'Ariane' },
  { id: 2, name: 'Pen Duick' },
]

function mountTab(canImport: boolean, boats = [fleet[0]]) {
  return mount(SettingsImportTab, {
    props: {
      boats,
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

/**
 * Flotte mono-bateau (#823) : le bateau est retenu d'office, les deux
 * sélecteurs (export et import) disparaissent et les exports sont actifs.
 */
describe('SettingsImportTab — flotte mono-bateau (#823)', () => {
  const exportLinks = (w: ReturnType<typeof mountTab>) =>
    w.findAll('a').filter((a) => a.text().startsWith('settings.import.export'))

  test('un seul bateau : aucun sélecteur de bateau, exports actifs d’emblée', () => {
    const w = mountTab(true)

    const selects = w.findAll('select')
    expect(selects).toHaveLength(1)
    expect(w.text()).not.toContain('settings.import.exportBoatLabel')
    expect(w.text()).not.toContain('settings.import.boatLabel')

    const links = exportLinks(w)
    expect(links).toHaveLength(3)
    for (const link of links) {
      expect(link.attributes('href')).toContain('/1/')
      expect(link.classes()).not.toContain('pointer-events-none')
    }
  })

  test('plusieurs bateaux : les deux sélecteurs sont là, exports inactifs sans choix', () => {
    const w = mountTab(true, fleet)

    expect(w.text()).toContain('settings.import.exportBoatLabel')
    expect(w.text()).toContain('settings.import.boatLabel')
    for (const link of exportLinks(w)) {
      expect(link.attributes('href')).toBeUndefined()
      expect(link.classes()).toContain('pointer-events-none')
    }
  })

  test('aucun bateau : le message reste affiché', () => {
    const w = mountTab(true, [])
    expect(w.text()).toContain('settings.import.noBoats')
  })
})

/**
 * Présélection par `?type=expenses&boatId=N` : le raccourci « Importer des
 * dépenses » de la page budget arrive ici avec le bateau et le type déjà
 * choisis. Le contrôleur a filtré les valeurs ; le composant les applique.
 */
describe('SettingsImportTab — présélection depuis la page budget', () => {
  test('type et bateau présélectionnés', () => {
    const w = mount(SettingsImportTab, {
      props: {
        boats: fleet,
        preview: null,
        hasPendingImport: false,
        canImport: true,
        initialType: 'expenses',
        initialBoatId: 2,
      },
    })

    const selects = w.findAll('select')
    const boatSelect = selects.find((s) =>
      s.findAll('option').some((o) => o.text() === 'Pen Duick')
    )!
    const typeSelect = selects.find((s) =>
      s.findAll('option').some((o) => o.attributes('value') === 'expenses')
    )!

    expect(boatSelect.element.value).toBe('2')
    expect(typeSelect.element.value).toBe('expenses')
  })

  test('un bateau absent de la flotte est ignoré, le type reste maintenance par défaut', () => {
    const w = mount(SettingsImportTab, {
      props: {
        boats: fleet,
        preview: null,
        hasPendingImport: false,
        canImport: true,
        initialType: null,
        initialBoatId: 99,
      },
    })

    const typeSelect = w
      .findAll('select')
      .find((s) => s.findAll('option').some((o) => o.attributes('value') === 'expenses'))!
    expect(typeSelect.element.value).toBe('maintenance')
    for (const link of w
      .findAll('a')
      .filter((a) => a.text().startsWith('settings.import.export'))) {
      expect(link.attributes('href')).toBeUndefined()
    }
  })
})
