import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

import DashboardEditToolbar from '../../inertia/components/dashboard/DashboardEditToolbar.vue'

const base = { canAdd: true, isDirty: true, isSaving: false, isCustomized: true }

describe('DashboardEditToolbar', () => {
  test('emits add, reset, cancel and done', async () => {
    const w = mount(DashboardEditToolbar, { props: base })
    await w.get('[data-testid="dashboard-edit-add"]').trigger('click')
    await w.get('[data-testid="dashboard-edit-reset"]').trigger('click')
    await w.get('[data-testid="dashboard-edit-cancel"]').trigger('click')
    await w.get('[data-testid="dashboard-edit-done"]').trigger('click')
    expect(w.emitted('add')).toHaveLength(1)
    expect(w.emitted('reset')).toHaveLength(1)
    expect(w.emitted('cancel')).toHaveLength(1)
    expect(w.emitted('done')).toHaveLength(1)
    expect(w.text()).toContain('dashboard.customize.done')
  })

  test('disables add without removed widgets and reset on the default layout', () => {
    const w = mount(DashboardEditToolbar, {
      props: { ...base, canAdd: false, isCustomized: false },
    })
    expect(w.get('[data-testid="dashboard-edit-add"]').attributes('disabled')).toBeDefined()
    expect(w.get('[data-testid="dashboard-edit-reset"]').attributes('disabled')).toBeDefined()
    expect(w.get('[data-testid="dashboard-edit-done"]').attributes('disabled')).toBeUndefined()
  })

  test('locks every action and shows the saving label while saving', () => {
    const w = mount(DashboardEditToolbar, { props: { ...base, isSaving: true } })
    for (const id of ['add', 'reset', 'cancel', 'done']) {
      expect(w.get(`[data-testid="dashboard-edit-${id}"]`).attributes('disabled')).toBeDefined()
    }
    expect(w.text()).toContain('dashboard.customize.saving')
  })
})
