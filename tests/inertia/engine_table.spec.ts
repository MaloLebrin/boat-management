import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import EngineTable from '../../inertia/components/engines/list/EngineTable.vue'
import type { EngineListItem } from '../../shared/types/engine'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
    locale: { value: 'fr' },
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { props: ['href'], template: '<a :href="href"><slot /></a>' },
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { props: ['variant'], template: '<span :data-variant="variant"><slot /></span>' },
}))

function engine(overrides: Partial<EngineListItem> = {}): EngineListItem {
  return {
    id: 7,
    boatId: 3,
    boatName: 'Alizé',
    brand: 'Yamaha',
    model: 'F150',
    serialNumber: null,
    kind: 'outboard',
    fuel: 'essence',
    family: 'outboard_4t',
    status: 'operational',
    powerHp: 150,
    hours: 320,
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

test('links each row to the engine detail page of its boat', () => {
  const w = mount(EngineTable, { props: { engines: [engine()] } })

  const hrefs = w.findAll('a').map((a) => a.attributes('href'))
  expect(hrefs).toContain('/boats/3/engines/7')
  expect(hrefs).toContain('/boats/3')
})

test('drops the columns no displayed engine fills in', () => {
  // Sans motorisation, puissance ni heures, ces colonnes seraient trois colonnes
  // de « — » : elles disparaissent, comme dans la liste des bateaux.
  const w = mount(EngineTable, {
    props: { engines: [engine({ family: null, powerHp: null, hours: null })] },
  })

  const headers = w.findAll('th').map((th) => th.text())
  expect(headers).toEqual([
    'engines.list.table.engine',
    'engines.list.table.boat',
    'engines.list.table.kind',
    'engines.list.table.status',
  ])
})

test('keeps a column as soon as a single row fills it in', () => {
  const w = mount(EngineTable, {
    props: {
      engines: [engine({ hours: null }), engine({ id: 8, hours: 12 })],
    },
  })

  expect(w.findAll('th').map((th) => th.text())).toContain('engines.list.table.hours')
})

test('renders the status badge with the same tone as the boat page', () => {
  const w = mount(EngineTable, {
    props: {
      engines: [
        engine({ id: 1, status: 'operational' }),
        engine({ id: 2, status: 'in_maintenance' }),
        engine({ id: 3, status: 'out_of_service' }),
        engine({ id: 4, status: 'retired' }),
      ],
    },
  })

  expect(w.findAll('[data-variant]').map((el) => el.attributes('data-variant'))).toEqual([
    'success',
    'info',
    'warning',
    'neutral',
  ])
})
