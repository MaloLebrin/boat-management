import { test } from '@japa/runner'
import {
  ALL_WIDGETS_AVAILABLE,
  groupDashboardWidgets,
  normalizeDashboardLayoutPayload,
  resolveDashboardLayout,
  visibleWidgets,
  visibleWidgetSet,
} from '#shared/helpers/dashboard_layout'
import {
  DEFAULT_DASHBOARD_ORDER,
  DEFAULT_HIDDEN_WIDGETS,
} from '#shared/constants/dashboard_widgets'
import type { StoredDashboardLayout } from '#shared/types/dashboard_layout'

const stored = (partial: Partial<StoredDashboardLayout> = {}): StoredDashboardLayout => ({
  version: 1,
  order: { main: [...DEFAULT_DASHBOARD_ORDER.main], side: [...DEFAULT_DASHBOARD_ORDER.side] },
  hidden: [],
  ...partial,
})

test.group('resolveDashboardLayout', () => {
  test('falls back to the default order when nothing is stored', ({ assert }) => {
    const layout = resolveDashboardLayout(null, ALL_WIDGETS_AVAILABLE)

    assert.deepEqual(layout.order.top, ['kpis'])
    assert.deepEqual(layout.order.main, [...DEFAULT_DASHBOARD_ORDER.main])
    assert.deepEqual(layout.order.side, [...DEFAULT_DASHBOARD_ORDER.side])
    // Les widgets « masqués par défaut » sont dans l'ordre (pour la galerie) mais masqués.
    assert.deepEqual(layout.hidden, [...DEFAULT_HIDDEN_WIDGETS])
    assert.deepEqual(visibleWidgets(layout, 'side'), [
      'ai_panel',
      'spend',
      'ports',
      'planned_tasks',
      'notifications',
    ])
    assert.isFalse(layout.isCustomized)
  })

  test('keeps a default-hidden widget hidden when it is missing from the stored order', ({
    assert,
  }) => {
    // Disposition enregistrée avant la livraison des widgets de la galerie.
    const layout = resolveDashboardLayout(
      stored({
        order: {
          main: [...DEFAULT_DASHBOARD_ORDER.main],
          side: ['ai_panel', 'spend', 'ports', 'planned_tasks', 'notifications'],
        },
        hidden: ['activity'],
      }),
      ALL_WIDGETS_AVAILABLE
    )

    assert.deepEqual(layout.hidden, ['activity', ...DEFAULT_HIDDEN_WIDGETS])
    // Ils sont réinsérés dans l'ordre (fin de colonne) pour alimenter la galerie.
    assert.deepEqual(layout.order.side, [...DEFAULT_DASHBOARD_ORDER.side])
    assert.notInclude(visibleWidgets(layout, 'side'), 'fuel')
  })

  test('shows a default-hidden widget once the stored order lists it', ({ assert }) => {
    const layout = resolveDashboardLayout(
      stored({
        order: {
          main: [...DEFAULT_DASHBOARD_ORDER.main],
          side: ['fuel', 'ai_panel', 'spend', 'ports', 'planned_tasks', 'notifications'],
        },
        hidden: ['safety_compliance', 'low_stock', 'invoicing', 'charter_occupancy'],
      }),
      ALL_WIDGETS_AVAILABLE
    )

    assert.equal(visibleWidgets(layout, 'side')[0], 'fuel')
    assert.notInclude(layout.hidden, 'fuel')
    assert.include(layout.hidden, 'invoicing')
  })

  test('keeps the stored order and hidden widgets', ({ assert }) => {
    const layout = resolveDashboardLayout(
      stored({
        order: {
          main: ['boats', 'attention', 'activity', 'at_sea', 'upcoming_reservations'],
          side: ['ports', 'ai_panel', 'spend', 'notifications', 'planned_tasks'],
        },
        hidden: ['activity', 'kpis'],
      }),
      ALL_WIDGETS_AVAILABLE
    )

    assert.deepEqual(layout.order.main, [
      'boats',
      'attention',
      'activity',
      'at_sea',
      'upcoming_reservations',
    ])
    // Les widgets de la galerie, absents de l'ordre stocké, sont réinsérés (et masqués).
    assert.deepEqual(layout.order.side, [
      'ports',
      'ai_panel',
      'spend',
      'notifications',
      ...DEFAULT_HIDDEN_WIDGETS,
      'planned_tasks',
    ])
    assert.deepEqual(layout.hidden, ['activity', 'kpis', ...DEFAULT_HIDDEN_WIDGETS])
    assert.isTrue(layout.isCustomized)
  })

  test('drops unknown, misplaced and duplicated ids', ({ assert }) => {
    const layout = resolveDashboardLayout(
      stored({
        order: {
          // `ai_panel` belongs to the side column, `weather` does not exist.
          main: ['boats', 'ai_panel', 'weather', 'boats', 'attention'] as never,
          side: ['spend', 'attention'],
        },
        hidden: ['weather', 'spend', 'spend'] as never,
      }),
      ALL_WIDGETS_AVAILABLE
    )

    assert.deepEqual(layout.order.main, [
      'boats',
      'attention',
      'at_sea',
      'upcoming_reservations',
      'activity',
    ])
    assert.notInclude(layout.order.side, 'attention')
    assert.deepEqual(layout.hidden, ['spend', ...DEFAULT_HIDDEN_WIDGETS])
  })

  test('re-inserts a widget missing from the stored order right after its default neighbour', ({
    assert,
  }) => {
    // Disposition enregistrée avant la livraison de `planned_tasks` et `notifications`.
    const layout = resolveDashboardLayout(
      stored({
        order: {
          main: ['activity', 'attention', 'boats'],
          side: ['ports', 'spend', 'ai_panel'],
        },
      }),
      ALL_WIDGETS_AVAILABLE
    )

    // `at_sea` suit `attention` dans le défaut, `upcoming_reservations` suit `at_sea`.
    assert.deepEqual(layout.order.main, [
      'activity',
      'attention',
      'at_sea',
      'upcoming_reservations',
      'boats',
    ])
    // `planned_tasks` suit `ports`, `notifications` suit `planned_tasks`, puis
    // les widgets de la galerie s'enchaînent (masqués).
    assert.deepEqual(layout.order.side, [
      'ports',
      'planned_tasks',
      'notifications',
      ...DEFAULT_HIDDEN_WIDGETS,
      'spend',
      'ai_panel',
    ])
  })

  test('puts a missing widget first when none of its predecessors is present', ({ assert }) => {
    const layout = resolveDashboardLayout(
      stored({ order: { main: ['boats', 'activity'], side: ['ai_panel'] } }),
      ALL_WIDGETS_AVAILABLE
    )

    assert.equal(layout.order.main[0], 'attention')
  })

  test('removes unavailable widgets from the order and the hidden list', ({ assert }) => {
    const layout = resolveDashboardLayout(stored({ hidden: ['spend', 'boats'] }), {
      ...ALL_WIDGETS_AVAILABLE,
      spend: false,
      ports: false,
      upcoming_reservations: false,
    })

    assert.deepEqual(layout.order.main, ['attention', 'at_sea', 'activity', 'boats'])
    assert.deepEqual(layout.order.side, [
      'ai_panel',
      'planned_tasks',
      'notifications',
      ...DEFAULT_HIDDEN_WIDGETS,
    ])
    // `stored()` liste les widgets de la galerie dans l'ordre : ils restent visibles.
    assert.deepEqual(layout.hidden, ['boats'])
  })

  test('drops an unavailable default-hidden widget from the order and the hidden list', ({
    assert,
  }) => {
    const layout = resolveDashboardLayout(null, {
      ...ALL_WIDGETS_AVAILABLE,
      invoicing: false,
      charter_occupancy: false,
    })

    assert.notInclude(layout.order.side, 'invoicing')
    assert.notInclude(layout.order.side, 'charter_occupancy')
    assert.notInclude(layout.hidden, 'invoicing')
    assert.include(layout.hidden, 'fuel')
  })

  test('never reorders the top zone', ({ assert }) => {
    const layout = resolveDashboardLayout(stored({ hidden: ['kpis'] }), ALL_WIDGETS_AVAILABLE)

    assert.deepEqual(layout.order.top, ['kpis'])
    assert.deepEqual(visibleWidgets(layout, 'top'), [])
  })
})

test.group('visibleWidgets / visibleWidgetSet', () => {
  test('exclude hidden widgets from the rendered order', ({ assert }) => {
    const layout = resolveDashboardLayout(
      stored({ hidden: ['activity', 'ports'] }),
      ALL_WIDGETS_AVAILABLE
    )

    assert.deepEqual(visibleWidgets(layout, 'main'), [
      'attention',
      'at_sea',
      'upcoming_reservations',
      'boats',
    ])
    const set = visibleWidgetSet(layout)
    assert.isTrue(set.has('kpis'))
    assert.isTrue(set.has('spend'))
    assert.isFalse(set.has('activity'))
    assert.isFalse(set.has('ports'))
  })
})

test.group('groupDashboardWidgets', () => {
  test('pairs consecutive half widgets and keeps full widgets alone', ({ assert }) => {
    assert.deepEqual(
      groupDashboardWidgets(['attention', 'at_sea', 'upcoming_reservations', 'boats']),
      [['attention'], ['at_sea', 'upcoming_reservations'], ['boats']]
    )
  })

  test('a lone half widget takes its own row', ({ assert }) => {
    assert.deepEqual(groupDashboardWidgets(['attention', 'at_sea', 'boats']), [
      ['attention'],
      ['at_sea'],
      ['boats'],
    ])
  })

  test('a full widget between two half widgets splits them', ({ assert }) => {
    assert.deepEqual(groupDashboardWidgets(['at_sea', 'activity', 'upcoming_reservations']), [
      ['at_sea'],
      ['activity'],
      ['upcoming_reservations'],
    ])
  })
})

test.group('normalizeDashboardLayoutPayload', () => {
  test('sanitises the payload with the same rules as the resolver', ({ assert }) => {
    const normalized = normalizeDashboardLayoutPayload(
      {
        order: {
          main: ['boats', 'spend', 'attention'],
          side: ['notifications', 'ai_panel'],
        },
        hidden: ['spend', 'kpis', 'ports'],
      },
      { ...ALL_WIDGETS_AVAILABLE, spend: false }
    )

    assert.equal(normalized.version, 1)
    assert.deepEqual(normalized.order.main, [
      'boats',
      'attention',
      'at_sea',
      'upcoming_reservations',
      'activity',
    ])
    // Réinsertion « après le voisin précédent du défaut » : les widgets de la
    // galerie suivent `notifications`, `ports` et `planned_tasks` suivent `ai_panel`.
    assert.deepEqual(normalized.order.side, [
      'notifications',
      ...DEFAULT_HIDDEN_WIDGETS,
      'ai_panel',
      'ports',
      'planned_tasks',
    ])
    // Les widgets de la galerie absents du corps restent masqués, explicitement.
    assert.deepEqual(normalized.hidden, ['kpis', 'ports', ...DEFAULT_HIDDEN_WIDGETS])
  })
})
