import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const unreadCount = vi.hoisted(() => ({ value: 0 }))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('~/composables/use_notifications', () => ({
  useNotifications: () => ({
    unreadCount: computed(() => unreadCount.value),
    recentNotifications: computed(() => []),
    hasUnread: computed(() => unreadCount.value > 0),
  }),
}))

// Stub the panel — its internals are covered elsewhere
vi.mock('~/components/layout/NotificationPanel.vue', () => ({
  default: {
    name: 'NotificationPanel',
    props: ['align'],
    template: '<div class="notification-panel-stub">{{ align }}</div>',
  },
}))

import NotificationBell from '../../inertia/components/layout/NotificationBell.vue'

beforeEach(() => {
  unreadCount.value = 0
})

describe('NotificationBell', () => {
  test('renders a bell trigger button', () => {
    const w = mount(NotificationBell)
    expect(w.find('button').exists()).toBe(true)
    expect(w.find('.notification-panel-stub').exists()).toBe(false)
  })

  test('hides the unread badge when there is nothing unread', () => {
    unreadCount.value = 0
    const w = mount(NotificationBell)
    expect(w.text()).not.toContain('9+')
    expect(w.find('span.bg-red-500').exists()).toBe(false)
  })

  test('shows the unread count badge', () => {
    unreadCount.value = 3
    const w = mount(NotificationBell)
    expect(w.find('span.bg-red-500').text()).toBe('3')
  })

  test('caps the unread badge at 9+', () => {
    unreadCount.value = 42
    const w = mount(NotificationBell)
    expect(w.find('span.bg-red-500').text()).toBe('9+')
  })

  test('toggles the panel open and closed on click', async () => {
    const w = mount(NotificationBell)
    await w.find('button').trigger('click')
    expect(w.find('.notification-panel-stub').exists()).toBe(true)
    await w.find('button').trigger('click')
    expect(w.find('.notification-panel-stub').exists()).toBe(false)
  })

  test('forwards the align prop to the panel', async () => {
    const w = mount(NotificationBell, { props: { align: 'left' } })
    await w.find('button').trigger('click')
    expect(w.find('.notification-panel-stub').text()).toBe('left')
  })

  test('applies onDark tone classes when requested', () => {
    const w = mount(NotificationBell, { props: { tone: 'onDark' } })
    expect(w.find('button').classes()).toContain('text-navy-100')
  })
})
