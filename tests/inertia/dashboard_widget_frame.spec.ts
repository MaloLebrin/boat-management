import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

import DashboardWidgetFrame from '../../inertia/components/dashboard/DashboardWidgetFrame.vue'

function mountFrame(props: Partial<InstanceType<typeof DashboardWidgetFrame>['$props']> = {}) {
  return mount(DashboardWidgetFrame, {
    props: {
      id: 'boats',
      editing: true,
      reorderable: true,
      canMoveUp: true,
      canMoveDown: false,
      ...props,
    },
    slots: { default: '<a href="/boats" data-testid="inner-link">Bateaux</a>' },
  })
}

describe('DashboardWidgetFrame', () => {
  test('renders the bare slot outside edit mode', () => {
    const w = mountFrame({ editing: false })
    expect(w.find('[data-testid="dashboard-widget-frame"]').exists()).toBe(false)
    expect(w.find('[data-testid="inner-link"]').exists()).toBe(true)
    expect(w.html()).not.toContain('inert')
  })

  test('makes the content inert and exposes remove and move controls in edit mode', async () => {
    const w = mountFrame()
    const frame = w.get('[data-testid="dashboard-widget-frame"]')
    expect(frame.attributes('data-widget')).toBe('boats')
    expect(frame.attributes('aria-label')).toBe(
      'dashboard.customize.frameLabel(dashboard.widgets.boats)'
    )
    const content = frame.get('[data-testid="dashboard-widget-content"]')
    expect(content.attributes('inert')).toBeDefined()
    expect(content.classes()).toContain('pointer-events-none')
    expect(content.find('[data-testid="inner-link"]').exists()).toBe(true)

    await frame.get('[data-testid="dashboard-widget-remove"]').trigger('click')
    expect(w.emitted('remove')).toHaveLength(1)

    expect(frame.get('[data-testid="dashboard-widget-up"]').attributes('disabled')).toBeUndefined()
    expect(frame.get('[data-testid="dashboard-widget-down"]').attributes('disabled')).toBeDefined()
    await frame.get('[data-testid="dashboard-widget-up"]').trigger('click')
    expect(w.emitted('move-up')).toHaveLength(1)
    await frame.get('[data-testid="dashboard-widget-down"]').trigger('click')
    expect(w.emitted('move-down')).toBeUndefined()
  })

  test('hides the arrows for a non-reorderable widget', () => {
    const w = mountFrame({ id: 'kpis', reorderable: false })
    expect(w.find('[data-testid="dashboard-widget-remove"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-widget-up"]').exists()).toBe(false)
    expect(w.find('[data-testid="dashboard-widget-down"]').exists()).toBe(false)
  })
})
