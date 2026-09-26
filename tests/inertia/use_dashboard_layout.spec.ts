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
const { DEFAULT_HIDDEN_WIDGETS } = await import('../../shared/constants/dashboard_widgets')

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
    // Les widgets de la galerie (masqués par défaut) restent proposés à l'ajout.
    expect(api.addable.value.side).toEqual([...DEFAULT_HIDDEN_WIDGETS])
    expect(api.canAdd.value).toBe(true)
  })

  test('adding a default-hidden widget makes the draft dirty and shows it in its column', () => {
    const api = useDashboardLayout(layout)
    api.startEditing()
    expect(api.visibleDraft('side')).not.toContain('fuel')
    api.add('fuel')
    expect(api.isDirty.value).toBe(true)
    expect(api.visibleDraft('side')).toContain('fuel')
    expect(api.addable.value.side).not.toContain('fuel')
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
      ...DEFAULT_HIDDEN_WIDGETS,
    ])
    // Les masqués par défaut sont envoyés explicitement : le blob stocké les porte.
    expect(payload.hidden).toEqual([...DEFAULT_HIDDEN_WIDGETS, 'ports'])
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
