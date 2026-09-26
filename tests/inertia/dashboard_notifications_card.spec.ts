import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { NotificationForFront } from '../../shared/types/notification'

const visit = vi.hoisted(() => vi.fn())
const patch = vi.hoisted(() => vi.fn())
const notifications = vi.hoisted(() => ({ value: [] as NotificationForFront[] }))

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
    getSeverityClasses: (severity: string) => `sev-${severity}`,
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardNotificationsCard from '../../inertia/components/dashboard/DashboardNotificationsCard.vue'

function notif(over: Partial<NotificationForFront>): NotificationForFront {
  return {
    id: 1,
    type: 'maintenance.due_soon',
    severity: 'warning',
    title: 'Vidange bientôt due',
    body: 'Albatros · dans 3 jours',
    actionUrl: '/planning?task=11',
    metadata: null,
    readAt: null,
    isRead: false,
    createdAt: '2026-09-26T08:00:00.000Z',
    ...over,
  }
}

beforeEach(() => {
  visit.mockClear()
  patch.mockClear()
  notifications.value = []
})

describe('DashboardNotificationsCard', () => {
  test('renders the empty state without unread notifications', () => {
    const w = mount(DashboardNotificationsCard)
    expect(w.text()).toContain('dashboard.notifications.empty')
    expect(w.find('[data-testid="dashboard-notifications-count"]').exists()).toBe(false)
    expect(w.get('[data-testid="dashboard-notifications-view-all"]').attributes('href')).toBe(
      '/notifications'
    )
  })

  test('renders the unread count and one row per notification', () => {
    notifications.value = [notif({ id: 1 }), notif({ id: 2, severity: 'error', body: null })]
    const w = mount(DashboardNotificationsCard)
    expect(w.get('[data-testid="dashboard-notifications-count"]').text()).toBe('2')
    const rows = w.findAll('[data-testid="dashboard-notification-row"]')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('Vidange bientôt due')
    expect(rows[0].text()).toContain('il y a 2 min')
    expect(rows[1].find('.sev-error').exists()).toBe(true)
  })

  test('marks the notification read then navigates to a safe internal path', async () => {
    notifications.value = [notif({ id: 7 })]
    const w = mount(DashboardNotificationsCard)
    await w.get('[data-testid="dashboard-notification-row"]').trigger('click')
    expect(patch).toHaveBeenCalledTimes(1)
    expect(patch.mock.calls[0]![0]).toBe('/notifications/7/read')
    const options = patch.mock.calls[0]![2] as { onSuccess: () => void }
    options.onSuccess()
    expect(visit).toHaveBeenCalledWith('/planning?task=11')
  })

  test('never navigates to an external action url', async () => {
    notifications.value = [notif({ id: 8, isRead: true, actionUrl: 'https://attaquant.example' })]
    const w = mount(DashboardNotificationsCard)
    await w.get('[data-testid="dashboard-notification-row"]').trigger('click')
    expect(patch).not.toHaveBeenCalled()
    expect(visit).not.toHaveBeenCalled()
  })
})
