import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
  }
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>' },
}))

import { usePage } from '@inertiajs/vue3'
import SettingsShell from '../../inertia/components/settings/SettingsShell.vue'
import type { Capability } from '../../shared/types/permissions'

const ALL_SETTINGS_CAPABILITIES: Capability[] = [
  'members.view',
  'subscription.view',
  'ai.configure',
  'audit_log.view',
  'branding.configure',
]

function mountShell(capabilities: Capability[], url = '/settings/me') {
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan: 'enterprise', permissions: { role: 'member', capabilities } },
    url,
  } as ReturnType<typeof usePage>)

  return mount(SettingsShell, {
    global: {
      stubs: {
        BaseHeading: { template: '<div><slot /></div>' },
      },
    },
  })
}

test('a user with every settings capability sees all sections (enterprise plan)', () => {
  const w = mountShell(ALL_SETTINGS_CAPABILITIES)
  expect(w.text()).toContain('settings.sections.me')
  expect(w.text()).toContain('settings.sections.org')
  expect(w.text()).toContain('settings.sections.members')
  expect(w.text()).toContain('settings.sections.billing')
  expect(w.text()).toContain('settings.sections.ai')
  expect(w.text()).toContain('settings.sections.auditLog')
  expect(w.text()).toContain('settings.sections.branding')
})

test('mechanic/boat_owner (no capability) only sees the personal "me" section', () => {
  const w = mountShell([])
  expect(w.text()).toContain('settings.sections.me')
  expect(w.text()).not.toContain('settings.sections.org')
  expect(w.text()).not.toContain('settings.sections.members')
  expect(w.text()).not.toContain('settings.sections.billing')
  expect(w.text()).not.toContain('settings.sections.ai')
  expect(w.text()).not.toContain('settings.sections.auditLog')
  expect(w.text()).not.toContain('settings.sections.branding')
})

test('a member (view-only capabilities) does not see admin-only ai/branding sections', () => {
  const w = mountShell(['members.view', 'subscription.view', 'audit_log.view'])
  expect(w.text()).toContain('settings.sections.org')
  expect(w.text()).toContain('settings.sections.members')
  expect(w.text()).toContain('settings.sections.billing')
  expect(w.text()).toContain('settings.sections.auditLog')
  expect(w.text()).not.toContain('settings.sections.ai')
  expect(w.text()).not.toContain('settings.sections.branding')
})

const ACTIVE_CLASSES = ['bg-brand/10', 'text-brand']

function activeLabels(url: string) {
  const w = mountShell(ALL_SETTINGS_CAPABILITIES, url)
  return w
    .findAll('a')
    .filter((link) => ACTIVE_CLASSES.every((c) => link.classes().includes(c)))
    .map((link) => link.text())
}

test('only the current section is highlighted on /settings/me', () => {
  expect(activeLabels('/settings/me')).toEqual(['settings.sections.me'])
})

// « me » est un préfixe de « members » : un startsWith brut surlignait les deux. Cf. #471.
test('"me" is not highlighted on /settings/members', () => {
  expect(activeLabels('/settings/members')).toEqual(['settings.sections.members'])
})

test('a query string does not break the active section', () => {
  expect(activeLabels('/settings/audit-log?page=2')).toEqual(['settings.sections.auditLog'])
})

test('a trailing slash does not break the active section', () => {
  expect(activeLabels('/settings/import/')).toEqual(['settings.sections.import'])
})

test('a sub-path keeps its parent section highlighted', () => {
  expect(activeLabels('/settings/billing/checkout')).toEqual(['settings.sections.billing'])
})
