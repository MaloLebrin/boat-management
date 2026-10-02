import { afterEach, describe, expect, test, vi } from 'vitest'
import { mountWithStubs, routerSpies } from './helpers/mount'
import { makeSpotRow } from './helpers/spot_row'
import { ROLE_PERMISSIONS } from '../../shared/types/permissions'
import type { OrgRole } from '../../shared/types/organization'
import type { HarbourOfficeData, MarinaStayRow } from '../../shared/types/marina'
import type { PortShowDetail } from '../../inertia/types/port'

/**
 * Capitainerie (#891) : chaque escale ne propose que les gestes que son
 * statut et le rôle permettent — la route refuserait les autres.
 */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

import MarinaStaysList from '../../inertia/components/ports/show/harbour/MarinaStaysList.vue'
import MarinaPlanFilter from '../../inertia/components/ports/show/MarinaPlanFilter.vue'
import HarbourOfficeTab from '../../inertia/components/ports/show/tabs/HarbourOfficeTab.vue'
import { useMarina } from '../../inertia/composables/use_marina'

function stay(overrides: Partial<MarinaStayRow> = {}): MarinaStayRow {
  return {
    id: 1,
    spotId: 1,
    spotName: 'A1',
    boatId: null,
    guestName: 'Belle Île',
    isVisitor: true,
    guestLengthM: null,
    visitorRegistration: null,
    visitorContact: null,
    clientId: null,
    clientName: null,
    arrivalOn: '2026-07-01',
    departureOn: '2026-07-04',
    nights: 3,
    status: 'expected',
    nightlyRate: 30,
    services: [],
    totalAmount: 90,
    invoiceId: null,
    notes: null,
    ...overrides,
  }
}

function permissions(role: OrgRole) {
  return { permissions: { role, capabilities: [...ROLE_PERMISSIONS[role]] } }
}

function stayButtons(status: MarinaStayRow['status'], role: OrgRole = 'admin') {
  const w = mountWithStubs(MarinaStaysList, {
    props: { portId: 3, stays: [stay({ status })] },
    pageProps: permissions(role),
  })
  const labels = w.findAll('button').map((b) => b.text().trim())
  w.unmount()
  return labels
}

afterEach(() => vi.restoreAllMocks())

describe('MarinaStaysList — gestes par statut (#891)', () => {
  test('attendue : arrivée, annuler, supprimer', () => {
    expect(stayButtons('expected')).toEqual([
      'ports.harbour.stays.actions.arrive',
      'ports.harbour.stays.actions.cancel',
      'ports.harbour.stays.actions.delete',
    ])
  })

  test('arrivée : départ, facturer, supprimer', () => {
    expect(stayButtons('arrived')).toEqual([
      'ports.harbour.stays.actions.depart',
      'ports.harbour.stays.actions.invoice',
      'ports.harbour.stays.actions.delete',
    ])
  })

  test('facturée : plus rien à faire, pas même supprimer', () => {
    expect(stayButtons('invoiced')).toEqual([])
  })

  test('un member fait avancer l’escale mais ne la supprime pas', () => {
    expect(stayButtons('arrived', 'member')).toEqual([
      'ports.harbour.stays.actions.depart',
      'ports.harbour.stays.actions.invoice',
    ])
  })

  test('un mécanicien ne voit aucun geste', () => {
    expect(stayButtons('arrived', 'mechanic')).toEqual([])
  })

  test('« Arrivée » envoie la transition au serveur, sans recharger toute la page', async () => {
    const w = mountWithStubs(MarinaStaysList, {
      props: { portId: 3, stays: [stay({ id: 7 })] },
      pageProps: permissions('admin'),
    })
    await w.findAll('button')[0].trigger('click')
    expect(routerSpies.patch).toHaveBeenCalledWith(
      '/ports/3/marina-stays/7/status',
      { status: 'arrived' },
      expect.objectContaining({ preserveScroll: true, only: ['harbour', 'port'] })
    )
  })
})

describe('Filtre de longueur du plan (#891)', () => {
  const port = {
    id: 3,
    name: 'P',
    city: null,
    country: null,
    address: null,
    notes: null,
    pontoons: [
      {
        id: 1,
        name: 'Ponton A',
        description: null,
        positionX: null,
        positionY: null,
        spots: [
          makeSpotRow({ id: 1, lengthM: 10 }),
          makeSpotRow({ id: 2, lengthM: 14 }),
          makeSpotRow({ id: 3, lengthM: 14, status: 'reserved', effectiveStatus: 'reserved' }),
          makeSpotRow({ id: 4, lengthM: 14, boat: { id: 9, name: 'X' } }),
          makeSpotRow({ id: 5, lengthM: null }),
        ],
      },
    ],
    mouillages: [],
  } as PortShowDetail

  test('ne garde que les places libres assez longues, jamais une longueur inconnue', () => {
    const { matchingSpotIds } = useMarina()
    expect([...matchingSpotIds(port, 12)]).toEqual([2])
    expect([...matchingSpotIds(port, 9)]).toEqual([1, 2])
    expect(matchingSpotIds(port, null).size).toBe(0)
  })

  test('le filtre annonce le nombre de places et se vide', async () => {
    const w = mountWithStubs(MarinaPlanFilter, { props: { modelValue: '12', matchCount: 1 } })
    expect(w.find('[data-testid="marina-filter-count"]').text()).toContain(
      'ports.plan.filter.matches'
    )
    await w.find('[data-testid="marina-filter-count"] button').trigger('click')
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([''])
  })

  test('sans longueur, pas de compteur', () => {
    const w = mountWithStubs(MarinaPlanFilter, { props: { modelValue: '', matchCount: 0 } })
    expect(w.find('[data-testid="marina-filter-count"]').exists()).toBe(false)
  })
})

describe('HarbourOfficeTab (#891)', () => {
  const harbour: HarbourOfficeData = {
    stays: [stay({ id: 1 }), stay({ id: 2, guestName: 'Partant', status: 'arrived' })],
    contracts: [],
    occupancy: { totalSpots: 4, occupiedNow: 1, rateNow: 25, rateMonth: 40 },
    arrivalsToday: [1],
    departuresToday: [2],
    today: '2026-07-01',
  }
  const port = {
    id: 3,
    name: 'P',
    city: null,
    country: null,
    address: null,
    notes: null,
    pontoons: [
      {
        id: 1,
        name: 'Ponton A',
        description: null,
        positionX: null,
        positionY: null,
        spots: [makeSpotRow({ id: 1 })],
      },
    ],
    mouillages: [],
  } as PortShowDetail

  function mountTab(role: OrgRole = 'admin') {
    return mountWithStubs(HarbourOfficeTab, {
      props: { port, boats: [], clients: [], harbour },
      pageProps: permissions(role),
      stubs: {
        MarinaStayFormModal: { template: '<div />' },
        MooringContractFormModal: { template: '<div />' },
      },
    })
  }

  test("les arrivées et départs du jour nomment l'invité", () => {
    const w = mountTab()
    expect(w.find('[data-testid="harbour-today-arrivals"]').text()).toContain('Belle Île')
    expect(w.find('[data-testid="harbour-today-departures"]').text()).toContain('Partant')
  })

  test('sans client, pas de bouton de contrat ; la nouvelle escale reste possible', () => {
    const labels = mountTab()
      .findAll('button')
      .map((b) => b.text().trim())
    expect(labels).toContain('ports.harbour.stays.add')
    expect(labels).not.toContain('ports.harbour.contracts.add')
  })
})
