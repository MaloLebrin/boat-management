import { describe, expect, test, vi } from 'vitest'
import { mountWithStubs } from './helpers/mount'
import { ROLE_PERMISSIONS } from '../../shared/types/permissions'
import type { OrgRole } from '../../shared/types/organization'

/**
 * Le profil organisation n'offre le renommage qu'à qui peut l'écrire (#761).
 *
 * L'onglet s'ouvre à `members.view` (admin + member, cf. `SettingsShell`), mais
 * `PUT /settings/org` est gardé par `organization.manage` — admin seul. Sans
 * cette distinction, un member voyait un formulaire que le backend refuse.
 *
 * Le test lit la vraie matrice `ROLE_PERMISSIONS` : déplacer la capacité d'un
 * rôle à l'autre se verra ici.
 */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

// Le `<Form>` réel appelle `useTuyau()`, qui exige un `TuyauProvider` au-dessus
// du composant monté (le setup global ne double que `Link`). Le doublon rend un
// vrai `<form>` et expose le même scope de slot, donc `find('form')` mesure bien
// la présence du formulaire de renommage.
vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
  Form: {
    name: 'MockInertiaForm',
    props: { action: { type: Object, required: false } },
    template: '<form><slot :processing="false" :errors="{}" /></form>',
  },
}))

import SettingsOrgTab from '../../inertia/components/settings/tabs/SettingsOrgTab.vue'

function mountAs(role: OrgRole) {
  return mountWithStubs(SettingsOrgTab, {
    props: { organization: { id: 1, name: 'Marina du Ponant' } } as Record<string, unknown>,
    pageProps: { permissions: { role, capabilities: [...ROLE_PERMISSIONS[role]] } },
  })
}

describe('SettingsOrgTab — renommage gardé par capacité (#761)', () => {
  test('un admin obtient le formulaire de renommage', () => {
    const w = mountAs('admin')

    expect(w.find('form').exists()).toBe(true)
    expect(w.text()).not.toContain('settings.org.readOnlyHint')
    w.unmount()
  })

  test('un member voit le nom sans pouvoir le réécrire', () => {
    const w = mountAs('member')

    expect(w.find('form').exists()).toBe(false)
    expect(w.text()).toContain('settings.org.readOnlyHint')
    // Le nom reste lisible : l'onglet informe, il n'agit pas.
    expect(w.find('input').attributes('disabled')).toBeDefined()
    expect((w.find('input').element as HTMLInputElement).value).toBe('Marina du Ponant')
    w.unmount()
  })
})
