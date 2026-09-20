import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { isSafeInternalPath, safeInternalPathOr } from '../../shared/helpers/safe_path'

/**
 * `actionUrl` des notifications (#780).
 *
 * La colonne est du texte libre, et sa valeur est passée telle quelle à une
 * navigation — `router.visit()` côté page Inertia, `clients.openWindow()` côté
 * service worker. Les producteurs actuels y écrivent tous des chemins
 * littéraux, donc rien n'est exploitable en l'état ; mais c'est une convention
 * tenue à la main sur huit sites d'écriture, et `router.visit` ne filtre pas le
 * schéma.
 *
 * Le cas qu'on oublie systématiquement est `//attaquant.example` : ça ressemble
 * à un chemin, et le navigateur lit la première partie comme un hôte.
 */

const visit = vi.hoisted(() => vi.fn())
const patch = vi.hoisted(() => vi.fn())
const notifications = vi.hoisted(() => ({ value: [] as unknown[] }))

vi.mock('@inertiajs/vue3', () => ({
  router: { visit, patch },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('~/composables/use_notifications', () => ({
  useNotifications: () => ({
    unreadCount: computed(() => notifications.value.length),
    recentNotifications: computed(() => notifications.value),
    hasUnread: computed(() => notifications.value.length > 0),
  }),
}))

vi.mock('~/composables/use_notification_helpers', () => ({
  useNotificationHelpers: () => ({
    formatRelativeTime: () => 'il y a 2 min',
    getSeverityClasses: () => '',
  }),
}))

import NotificationPanel from '../../inertia/components/layout/NotificationPanel.vue'

/**
 * Le bouton de la notification, et pas celui de « tout marquer comme lu » qui
 * le précède dans l'en-tête du panneau.
 */
function clickFirstNotification(wrapper: ReturnType<typeof mount>) {
  const item = wrapper.find('button.w-full')
  expect(item.exists()).toBe(true)
  return item.trigger('click')
}

function notification(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    type: 'maintenance_due',
    severity: 'info',
    title: 'Entretien à prévoir',
    body: null,
    actionUrl: '/boats/1',
    isRead: true,
    createdAt: '2026-09-19T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  visit.mockClear()
  patch.mockClear()
  notifications.value = []
})

describe('isSafeInternalPath', () => {
  test('accepts a relative internal path', () => {
    expect(isSafeInternalPath('/boats/1')).toBe(true)
    expect(isSafeInternalPath('/')).toBe(true)
    expect(isSafeInternalPath('/settings/me?tab=profile')).toBe(true)
  })

  test('rejects an absolute URL', () => {
    expect(isSafeInternalPath('https://attaquant.example/x')).toBe(false)
    expect(isSafeInternalPath('http://attaquant.example')).toBe(false)
  })

  test('rejects a scheme', () => {
    expect(isSafeInternalPath('javascript:alert(1)')).toBe(false)
    expect(isSafeInternalPath('data:text/html,<script>')).toBe(false)
  })

  test('rejects a protocol-relative URL', () => {
    // Le cas qu'on oublie : ça commence bien par une barre oblique.
    expect(isSafeInternalPath('//attaquant.example/x')).toBe(false)
    expect(isSafeInternalPath('/\\attaquant.example/x')).toBe(false)
  })

  test('rejects an empty string and non-strings', () => {
    expect(isSafeInternalPath('')).toBe(false)
    expect(isSafeInternalPath(null)).toBe(false)
    expect(isSafeInternalPath(undefined)).toBe(false)
    expect(isSafeInternalPath(42)).toBe(false)
  })

  test('rejects control characters used to slip past naive filters', () => {
    expect(isSafeInternalPath('/\u0000javascript:alert(1)')).toBe(false)
    expect(isSafeInternalPath('/boats\n/1')).toBe(false)
  })

  test('safeInternalPathOr falls back to the root', () => {
    expect(safeInternalPathOr('//attaquant.example')).toBe('/')
    expect(safeInternalPathOr('/boats/1')).toBe('/boats/1')
    expect(safeInternalPathOr(undefined, '/dashboard')).toBe('/dashboard')
  })
})

describe('NotificationPanel — actionUrl', () => {
  test('navigates for a safe internal path', async () => {
    notifications.value = [notification({ actionUrl: '/boats/42' })]
    const wrapper = mount(NotificationPanel)

    await clickFirstNotification(wrapper)

    expect(visit).toHaveBeenCalledWith('/boats/42')
  })

  test('does not navigate for a hostile actionUrl', async () => {
    notifications.value = [notification({ actionUrl: 'https://attaquant.example/phishing' })]
    const wrapper = mount(NotificationPanel)

    await clickFirstNotification(wrapper)

    expect(visit).not.toHaveBeenCalledWith('https://attaquant.example/phishing')
  })

  test('does not navigate for a protocol-relative actionUrl', async () => {
    notifications.value = [notification({ actionUrl: '//attaquant.example/phishing' })]
    const wrapper = mount(NotificationPanel)

    await clickFirstNotification(wrapper)

    expect(visit).not.toHaveBeenCalledWith('//attaquant.example/phishing')
  })

  test('still marks an unread notification as read even when the link is refused', async () => {
    // La lecture ne doit pas être l'otage du lien : refuser la navigation ne
    // doit pas laisser la notification en non-lu.
    notifications.value = [notification({ isRead: false, actionUrl: 'javascript:alert(1)' })]
    const wrapper = mount(NotificationPanel)

    await clickFirstNotification(wrapper)

    expect(patch).toHaveBeenCalledWith('/notifications/1/read', {}, expect.anything())
  })
})
