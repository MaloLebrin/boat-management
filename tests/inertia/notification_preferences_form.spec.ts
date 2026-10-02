import { describe, expect, test, vi } from 'vitest'
import { formSpies, forms, resetInertiaMock } from './helpers/inertia_mock'
import { mountWithStubs } from './helpers/mount'
import type { NotificationPreferencesProps } from '../../shared/types/notification'

/** Matrice familles × canaux de `/settings/notifications` (#888). */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

import NotificationPreferencesForm from '../../inertia/components/settings/notifications/NotificationPreferencesForm.vue'

function preferences(): NotificationPreferencesProps {
  return {
    families: {
      fleet: { inApp: true, push: true, email: false },
      rental: { inApp: true, push: true, email: false },
      billing: { inApp: false, push: false, email: false },
      team: { inApp: true, push: true, email: false },
      ai: { inApp: true, push: false, email: false },
    },
    quietHours: false,
    emailDigest: false,
    timezone: 'Europe/Paris',
  }
}

describe('NotificationPreferencesForm', () => {
  test('renders one row per family and one checkbox per channel', () => {
    resetInertiaMock()
    const w = mountWithStubs(NotificationPreferencesForm, { props: { preferences: preferences() } })
    const rows = w.findAll('[data-testid="preference-row"]')
    expect(rows).toHaveLength(5)
    expect(rows[0].findAll('input[type="checkbox"]')).toHaveLength(3)
    expect(rows[0].text()).toContain('notifications.families.fleet.label')
    w.unmount()
  })

  test('a cell edits the matching family and channel', async () => {
    resetInertiaMock()
    const w = mountWithStubs(NotificationPreferencesForm, { props: { preferences: preferences() } })
    await w.find('input[name="rental.email"]').setValue(true)
    const form = forms[0] as unknown as { families: NotificationPreferencesProps['families'] }
    expect(form.families.rental.email).toBe(true)
    expect(form.families.fleet.email).toBe(false)
    w.unmount()
  })

  test('"mute all" turns a whole channel off, then back on', async () => {
    resetInertiaMock()
    const w = mountWithStubs(NotificationPreferencesForm, { props: { preferences: preferences() } })
    const form = forms[0] as unknown as { families: NotificationPreferencesProps['families'] }
    const toggle = w.find('[data-testid="toggle-column-push"]')

    expect(toggle.text()).toBe('settings.notifications.preferences.muteAll')
    await toggle.trigger('click')
    expect(Object.values(form.families).every((c) => c.push === false)).toBe(true)
    expect(toggle.text()).toBe('settings.notifications.preferences.enableAll')

    await toggle.trigger('click')
    expect(Object.values(form.families).every((c) => c.push === true)).toBe(true)
    w.unmount()
  })

  test('saves with a PUT on the preferences route', async () => {
    resetInertiaMock()
    formSpies.put.mockClear()
    const w = mountWithStubs(NotificationPreferencesForm, { props: { preferences: preferences() } })
    await w.find('form').trigger('submit')
    expect(formSpies.put).toHaveBeenCalledWith('/settings/notifications/preferences', {
      preserveScroll: true,
    })
    w.unmount()
  })
})
