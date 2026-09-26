import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const routerPut = vi.fn()
const routerDelete = vi.fn()

vi.mock('@inertiajs/vue3', () => ({
  router: {
    put: (...args: unknown[]) => routerPut(...args),
    delete: (...args: unknown[]) => routerDelete(...args),
  },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

import DashboardCustomizeModal from '../../inertia/components/dashboard/DashboardCustomizeModal.vue'
import {
  ALL_WIDGETS_AVAILABLE,
  resolveDashboardLayout,
} from '../../shared/helpers/dashboard_layout'
import type { ResolvedDashboardLayout } from '../../shared/types/dashboard_layout'

function mountModal(
  layout: ResolvedDashboardLayout = resolveDashboardLayout(null, ALL_WIDGETS_AVAILABLE)
) {
  return mount(DashboardCustomizeModal, {
    props: { open: true, layout },
    global: { stubs: { teleport: true } },
  })
}

const rowIds = (w: ReturnType<typeof mountModal>, zone: string) =>
  w
    .get(`[data-testid="dashboard-customize-zone-${zone}"]`)
    .findAll('li')
    .map((li) => li.attributes('data-testid')!.replace('dashboard-customize-row-', ''))

beforeEach(() => {
  routerPut.mockClear()
  routerDelete.mockClear()
})

describe('DashboardCustomizeModal', () => {
  test('lists every available widget per zone, in the served order', () => {
    const w = mountModal()
    expect(rowIds(w, 'top')).toEqual(['kpis'])
    expect(rowIds(w, 'main')).toEqual([
      'attention',
      'at_sea',
      'upcoming_reservations',
      'activity',
      'boats',
    ])
    expect(rowIds(w, 'side')).toEqual([
      'ai_panel',
      'spend',
      'ports',
      'planned_tasks',
      'notifications',
    ])
    expect(w.text()).toContain('dashboard.widgets.at_sea')
  })

  test('the top zone has no arrows and the arrows are disabled at the bounds', () => {
    const w = mountModal()
    const kpis = w.get('[data-testid="dashboard-customize-row-kpis"]')
    expect(kpis.find('[data-testid="dashboard-customize-up"]').exists()).toBe(false)

    const first = w.get('[data-testid="dashboard-customize-row-attention"]')
    expect(first.get('[data-testid="dashboard-customize-up"]').attributes('disabled')).toBeDefined()
    expect(
      first.get('[data-testid="dashboard-customize-down"]').attributes('disabled')
    ).toBeUndefined()

    const last = w.get('[data-testid="dashboard-customize-row-boats"]')
    expect(
      last.get('[data-testid="dashboard-customize-down"]').attributes('disabled')
    ).toBeDefined()
  })

  test('toggles visibility and reorders locally, then saves the payload with PUT', async () => {
    const w = mountModal()
    const save = w.get('[data-testid="dashboard-customize-save"]')
    expect(save.attributes('disabled')).toBeDefined()

    await w
      .get('[data-testid="dashboard-customize-row-activity"]')
      .get('button[role="switch"]')
      .trigger('click')
    expect(
      w
        .get('[data-testid="dashboard-customize-row-activity"]')
        .get('button[role="switch"]')
        .attributes('aria-checked')
    ).toBe('false')

    await w
      .get('[data-testid="dashboard-customize-row-boats"]')
      .get('[data-testid="dashboard-customize-up"]')
      .trigger('click')
    await w
      .get('[data-testid="dashboard-customize-row-ai_panel"]')
      .get('[data-testid="dashboard-customize-down"]')
      .trigger('click')

    expect(rowIds(w, 'main')).toEqual([
      'attention',
      'at_sea',
      'upcoming_reservations',
      'boats',
      'activity',
    ])
    expect(rowIds(w, 'side')).toEqual([
      'spend',
      'ai_panel',
      'ports',
      'planned_tasks',
      'notifications',
    ])

    expect(save.attributes('disabled')).toBeUndefined()
    await save.trigger('click')

    expect(routerPut).toHaveBeenCalledTimes(1)
    const [path, payload, options] = routerPut.mock.calls[0] as [
      string,
      unknown,
      { preserveScroll: boolean },
    ]
    expect(path).toBe('/dashboard/layout')
    expect(payload).toEqual({
      order: {
        main: ['attention', 'at_sea', 'upcoming_reservations', 'boats', 'activity'],
        side: ['spend', 'ai_panel', 'ports', 'planned_tasks', 'notifications'],
      },
      hidden: ['activity'],
    })
    expect(options.preserveScroll).toBe(true)
  })

  test('reset is disabled on the default layout and calls DELETE once customised', async () => {
    const pristine = mountModal()
    expect(
      pristine.get('[data-testid="dashboard-customize-reset"]').attributes('disabled')
    ).toBeDefined()

    const customised = mountModal({
      ...resolveDashboardLayout(null, ALL_WIDGETS_AVAILABLE),
      isCustomized: true,
    })
    const reset = customised.get('[data-testid="dashboard-customize-reset"]')
    expect(reset.attributes('disabled')).toBeUndefined()
    await reset.trigger('click')
    expect(routerDelete).toHaveBeenCalledTimes(1)
    expect(routerDelete.mock.calls[0]![0]).toBe('/dashboard/layout')
  })

  test('drops the draft when reopened', async () => {
    const w = mountModal()
    await w
      .get('[data-testid="dashboard-customize-row-boats"]')
      .get('button[role="switch"]')
      .trigger('click')
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(
      w
        .get('[data-testid="dashboard-customize-row-boats"]')
        .get('button[role="switch"]')
        .attributes('aria-checked')
    ).toBe('true')
    expect(w.get('[data-testid="dashboard-customize-save"]').attributes('disabled')).toBeDefined()
  })
})
