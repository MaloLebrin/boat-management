import { beforeEach, describe, expect, test, vi } from 'vitest'

const routerPut = vi.fn()
const routerDelete = vi.fn()

vi.mock('@inertiajs/vue3', () => ({
  router: {
    put: (...args: unknown[]) => routerPut(...args),
    delete: (...args: unknown[]) => routerDelete(...args),
  },
}))

const { useDashboardLayout } = await import('../../inertia/composables/use_dashboard_layout')
const { ALL_WIDGETS_AVAILABLE, resolveDashboardLayout } =
  await import('../../shared/helpers/dashboard_layout')

const layout = () => resolveDashboardLayout(null, ALL_WIDGETS_AVAILABLE)

beforeEach(() => {
  routerPut.mockClear()
  routerDelete.mockClear()
})

describe('useDashboardLayout', () => {
  test('starts from the served layout and tracks dirtiness', () => {
    const api = useDashboardLayout(layout)
    expect(api.isEditing.value).toBe(false)
    expect(api.isDirty.value).toBe(false)
    api.startEditing()
    expect(api.isEditing.value).toBe(true)
    api.remove('activity')
    expect(api.isDirty.value).toBe(true)
    expect(api.visibleDraft('main')).toEqual([
      'attention',
      'at_sea',
      'upcoming_reservations',
      'boats',
    ])
    expect(api.addable.value.main).toEqual(['activity'])
    expect(api.canAdd.value).toBe(true)
    api.add('activity')
    expect(api.isDirty.value).toBe(false)
    expect(api.canAdd.value).toBe(false)
  })

  test('move swaps with the visible neighbour and skips removed widgets', () => {
    const api = useDashboardLayout(layout)
    api.startEditing()
    api.remove('upcoming_reservations')
    // `at_sea` descend : son voisin visible est `activity`, pas le widget retiré.
    api.move('main', 'at_sea', 1)
    expect(api.visibleDraft('main')).toEqual(['attention', 'activity', 'at_sea', 'boats'])
    expect(api.draftOrder.value.main).toEqual([
      'attention',
      'activity',
      'upcoming_reservations',
      'at_sea',
      'boats',
    ])
    expect(api.canMove('main', 'attention', -1)).toBe(false)
    expect(api.canMove('top', 'kpis', 1)).toBe(false)
  })

  test('add appends a widget missing from the draft order to its own zone', () => {
    const api = useDashboardLayout(() => ({
      ...layout(),
      order: { top: ['kpis'], main: ['attention'], side: ['ai_panel'] },
      hidden: [],
    }))
    api.startEditing()
    api.add('boats')
    expect(api.draftOrder.value.main).toEqual(['attention', 'boats'])
  })

  test('cancel drops the draft, Done saves only when dirty and leaves edit mode', () => {
    const api = useDashboardLayout(layout)
    api.startEditing()
    api.remove('ports')
    api.cancelEditing()
    expect(api.isEditing.value).toBe(false)
    expect(api.isDirty.value).toBe(false)

    api.startEditing()
    api.finishEditing()
    expect(routerPut).not.toHaveBeenCalled()
    expect(api.isEditing.value).toBe(false)

    api.startEditing()
    api.remove('ports')
    api.move('side', 'notifications', -1)
    api.finishEditing()
    expect(routerPut).toHaveBeenCalledTimes(1)
    const [path, payload, options] = routerPut.mock.calls[0] as [
      string,
      { order: { side: string[] }; hidden: string[] },
      { preserveScroll: boolean; onStart: () => void; onFinish: () => void; onSuccess: () => void },
    ]
    expect(path).toBe('/dashboard/layout')
    expect(payload.order.side).toEqual([
      'ai_panel',
      'spend',
      'ports',
      'notifications',
      'planned_tasks',
    ])
    expect(payload.hidden).toEqual(['ports'])
    expect(options.preserveScroll).toBe(true)
    options.onStart()
    expect(api.isSaving.value).toBe(true)
    options.onSuccess()
    options.onFinish()
    expect(api.isEditing.value).toBe(false)
    expect(api.isSaving.value).toBe(false)
  })

  test('reset calls DELETE and leaves edit mode on success', () => {
    const api = useDashboardLayout(() => ({ ...layout(), isCustomized: true }))
    api.startEditing()
    api.reset()
    expect(routerDelete).toHaveBeenCalledTimes(1)
    const [path, options] = routerDelete.mock.calls[0] as [string, { onSuccess: () => void }]
    expect(path).toBe('/dashboard/layout')
    options.onSuccess()
    expect(api.isEditing.value).toBe(false)
  })
})
