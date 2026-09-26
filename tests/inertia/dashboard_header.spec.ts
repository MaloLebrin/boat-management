import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDateLong: () => 'vendredi 26 septembre 2026' }),
}))

import DashboardHeader from '../../inertia/components/dashboard/DashboardHeader.vue'

test('greets with the current date once mounted and renders the actions slot (#832)', async () => {
  const w = mount(DashboardHeader, { slots: { actions: '<button>create</button>' } })
  await w.vm.$nextTick()
  expect(w.get('[data-testid="dashboard-greeting"]').text()).toBe(
    'dashboard.greeting(vendredi 26 septembre 2026)'
  )
  expect(w.find('button').text()).toBe('create')
  expect(w.text()).not.toContain('dashboard.subtitle')
})
