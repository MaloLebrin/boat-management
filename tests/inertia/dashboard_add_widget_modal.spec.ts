import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

import DashboardAddWidgetModal from '../../inertia/components/dashboard/DashboardAddWidgetModal.vue'

function mountModal(addable: { top: string[]; main: string[]; side: string[] }) {
  return mount(DashboardAddWidgetModal, {
    props: { open: true, addable: addable as never },
    global: { stubs: { teleport: true } },
  })
}

describe('DashboardAddWidgetModal', () => {
  test('lists the removed widgets by zone with a description', () => {
    const w = mountModal({ top: ['kpis'], main: ['activity'], side: [] })
    expect(w.find('[data-testid="dashboard-add-zone-top"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-add-zone-main"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-add-zone-side"]').exists()).toBe(false)
    expect(w.text()).toContain('dashboard.widgets.activity')
    expect(w.text()).toContain('dashboard.widgetDescriptions.activity')
    expect(w.find('[data-testid="dashboard-add-empty"]').exists()).toBe(false)
  })

  test('Add emits the widget id and closes the modal', async () => {
    const w = mountModal({ top: [], main: ['activity'], side: ['spend'] })
    await w.get('[data-testid="dashboard-add-spend"]').trigger('click')
    expect(w.emitted('add')).toEqual([['spend']])
    expect(w.emitted('update:open')).toEqual([[false]])
  })

  test('shows the empty state when every widget is displayed', () => {
    const w = mountModal({ top: [], main: [], side: [] })
    expect(w.find('[data-testid="dashboard-add-empty"]').exists()).toBe(true)
  })
})
