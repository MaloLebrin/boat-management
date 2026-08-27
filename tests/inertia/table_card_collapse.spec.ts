import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

/**
 * #493 — replis carte des écrans terrain : chaque écran rend les cartes
 * (`lg:hidden`) ET la table/rangée (`hidden lg:block`), et les cartes montrent
 * les mêmes données que les lignes — aucun champ perdu au passage.
 */

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { get: vi.fn(), visit: vi.fn() },
  Head: { template: '<div />' },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href', 'route'] },
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span><slot /></span>', props: ['variant'] },
}))

import LogbookCard from '../../inertia/components/navigation/LogbookCard.vue'
import LogbookRow from '../../inertia/components/navigation/LogbookRow.vue'
import FuelLogCard from '../../inertia/components/navigation/FuelLogCard.vue'
import IncidentCard from '../../inertia/components/navigation/IncidentCard.vue'
import MaintenanceHistoryTimeline from '../../inertia/components/maintenance/MaintenanceHistoryTimeline.vue'
import type {
  FleetFuelLogRow,
  FleetIncidentRow,
  FleetLogbookRow,
} from '../../shared/types/navigation'
import type { MaintenanceEventRow } from '../../shared/types/maintenance'

const logbookRow: FleetLogbookRow = {
  id: 1,
  boatId: 4,
  boatName: 'Bora Bora',
  status: 'completed',
  departedAt: '2026-08-20T08:00:00.000Z',
  arrivedAt: '2026-08-20T12:00:00.000Z',
  departurePortName: 'Marseille',
  arrivalPortName: 'Cassis',
  distanceNm: 12,
  crewCount: 3,
  seaState: null,
  windForceBeaufort: 3,
}

const fuelRow: FleetFuelLogRow = {
  id: 2,
  boatId: 4,
  boatName: 'Bora Bora',
  fueledAt: '2026-08-21T09:00:00.000Z',
  quantityLiters: 50,
  totalCost: 120,
  supplier: 'Total Marine',
  notes: null,
}

const incidentRow: FleetIncidentRow = {
  id: 3,
  boatId: 4,
  boatName: 'Bora Bora',
  occurredAt: '2026-08-22T10:00:00.000Z',
  type: 'engine_failure',
  status: 'open',
  location: 'Cap Croisette',
  description: 'Surchauffe',
  insuranceClaimed: false,
}

const maintenanceEvent: MaintenanceEventRow = {
  id: 5,
  boatId: 4,
  boatName: 'Bora Bora',
  subject: 'engine',
  title: 'Vidange moteur',
  notes: 'Huile 10W40',
  performedAt: '2026-08-15',
  engineCaption: null,
  sailCaption: null,
  boatEngineId: 7,
  boatSailId: null,
  boatRigId: null,
  boatSafetyEquipmentId: null,
  parts: [{ id: 1, name: 'Filtre à huile', quantity: 1 }],
  totalCost: null,
}

describe('replis carte mobile (#493)', () => {
  test('LogbookCard shows every field the table row shows', () => {
    const card = mount(LogbookCard, { props: { row: logbookRow } })
    const row = mount(LogbookRow, { props: { row: logbookRow } })

    for (const value of ['Bora Bora', 'Marseille', 'Cassis']) {
      expect(card.text()).toContain(value)
      expect(row.text()).toContain(value)
    }
    // statut, distance et date présents sur la carte
    expect(card.text()).toContain('navigation.logbook.status.completed')
    expect(card.text()).toContain('navigation.logbook.nm')
    expect(card.find('a').attributes('href')).toBe('/boats/4/navigation')
  })

  test('FuelLogCard shows quantity, cost, supplier and date', () => {
    const card = mount(FuelLogCard, { props: { row: fuelRow } })

    expect(card.text()).toContain('Bora Bora')
    expect(card.text()).toContain('navigation.fuel.liters')
    expect(card.text()).toContain('Total Marine')
    expect(card.find('a').attributes('href')).toBe('/boats/4/navigation')
  })

  test('IncidentCard shows status, type, date and location', () => {
    const card = mount(IncidentCard, { props: { row: incidentRow } })

    expect(card.text()).toContain('Bora Bora')
    expect(card.text()).toContain('incidents.status.open')
    expect(card.text()).toContain('incidents.type.engine_failure')
    expect(card.text()).toContain('Cap Croisette')
  })

  test('MaintenanceHistoryTimeline renders both the mobile cards and the desktop rows', () => {
    const wrapper = mount(MaintenanceHistoryTimeline, {
      props: { events: [maintenanceEvent] },
    })

    const mobileBlock = wrapper.find('.lg\\:hidden')
    expect(mobileBlock.exists()).toBe(true)
    expect(mobileBlock.text()).toContain('Vidange moteur')

    const desktopBlock = wrapper.find('.hidden.lg\\:block')
    expect(desktopBlock.exists()).toBe(true)
    expect(desktopBlock.text()).toContain('Vidange moteur')
  })

  // Les pages elles-mêmes sont lourdes à monter (modales, filtres) : on vérifie
  // le motif de repli dans le source, comme le scan de thème.
  test('each screen pairs a lg:hidden cards block with a hidden lg:block table', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const screens: Array<{ page: string; card: string }> = [
      { page: 'inertia/pages/navigation/logbook.vue', card: 'LogbookCard' },
      { page: 'inertia/pages/navigation/fuel.vue', card: 'FuelLogCard' },
      { page: 'inertia/pages/navigation/incidents.vue', card: 'IncidentCard' },
      {
        page: 'inertia/components/maintenance/MaintenanceHistoryTimeline.vue',
        card: 'MaintenanceHistoryCard',
      },
    ]
    for (const { page, card } of screens) {
      const source = readFileSync(resolve(process.cwd(), page), 'utf8')
      expect(source, `${page} : bloc cartes lg:hidden`).toContain('lg:hidden')
      expect(source, `${page} : table hidden lg:block`).toContain('hidden lg:block')
      expect(source, `${page} : utilise ${card}`).toContain(card)
    }
  })

  test('the maintenance card expands to notes and parts on its own', async () => {
    const wrapper = mount(MaintenanceHistoryTimeline, {
      props: { events: [maintenanceEvent] },
    })
    const mobileBlock = wrapper.find('.lg\\:hidden')
    expect(mobileBlock.text()).not.toContain('Huile 10W40')

    await mobileBlock.find('button').trigger('click')

    expect(mobileBlock.text()).toContain('Huile 10W40')
    expect(mobileBlock.text()).toContain('Filtre à huile')
  })
})
