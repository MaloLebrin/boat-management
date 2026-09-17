import type { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mountWithStubs, routerSpies } from './helpers/mount'
import type { BoatBudgetEntryItem, BoatPortStayItem } from '../../shared/types/budget'
import type { NavigationLogEntryRow } from '../../shared/types/navigation_log'
import type { MouillageRow, PontoonRow, SpotRow } from '../../inertia/types/port'

/**
 * Caractérisation des suppressions gardées par une confirmation native, avant
 * l'extraction du helper partagé (vague 3.5). Dix-huit sites répètent
 * `if (!confirm(t('…'))) return` suivi d'un `router.delete`, avec trois formes :
 * la garde nue, la garde précédée d'un pré-contrôle (`alert` des pontons et
 * mouillages occupés), et la garde booléenne lue depuis un template.
 *
 * Ce que ces tests figent, site par site : la clé du message demandé, le fait
 * qu'un refus n'envoie **rien**, et la requête exacte — URL et options, dont
 * l'absence d'options des deux cartes de port.
 *
 * `MediaPhotoGallery` (URL fournie par une prop) est déjà couvert par
 * `media_photo_gallery.spec.ts`, dans les deux sens.
 */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { props: ['href'], template: '<a :href="href"><slot /></a>' },
  Form: {
    props: ['action'],
    emits: ['submit'],
    template: '<form @submit="$emit(\'submit\', $event)"><slot :processing="false" /></form>',
  },
}))

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({ formatCurrency: (v: number) => `${v} €` }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatDate: (s: string) => s,
    formatDateTime: (s: string) => s,
    formatDateLong: (s: string) => s,
  }),
}))

import BudgetEntryList from '../../inertia/components/boats/budget/BudgetEntryList.vue'
import BudgetPortStayList from '../../inertia/components/boats/budget/BudgetPortStayList.vue'
import NavigationLogEntryList from '../../inertia/components/boats/navigation-log/NavigationLogEntryList.vue'
import BoatMaintenanceSheetCard from '../../inertia/components/boats/sheets/BoatMaintenanceSheetCard.vue'
import MouillageCard from '../../inertia/components/ports/show/MouillageCard.vue'
import PontoonCard from '../../inertia/components/ports/show/PontoonCard.vue'

/** Dernier message passé à la confirmation native. */
let confirmCalls: string[] = []
let alertCalls: string[] = []

function stubDialogs(answer: boolean) {
  confirmCalls = []
  alertCalls = []
  vi.stubGlobal(
    'confirm',
    vi.fn((message: string) => {
      confirmCalls.push(message)
      return answer
    })
  )
  vi.stubGlobal(
    'alert',
    vi.fn((message: string) => {
      alertCalls.push(message)
    })
  )
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

/** Clique le bouton dont le libellé est exactement cette clé de traduction. */
async function clickButton(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll('button').find((b) => b.text().trim() === label)
  expect(button, `bouton « ${label} » introuvable`).toBeTruthy()
  await button!.trigger('click')
}

const budgetEntry: BoatBudgetEntryItem = {
  id: 11,
  label: 'Taxe de francisation',
  amount: 1250,
  date: '2026-03-15',
  category: 'documents',
  description: null,
}

describe('BudgetEntryList', () => {
  function mountList() {
    return mountWithStubs(BudgetEntryList, {
      props: { boatId: 1, entries: [budgetEntry], canManage: true },
    })
  }

  test('un refus ne supprime rien', async () => {
    stubDialogs(false)
    await clickButton(mountList(), 'common.delete')

    expect(confirmCalls).toEqual(['budget.entries.deleteConfirm'])
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('une confirmation supprime avec le défilement conservé', async () => {
    stubDialogs(true)
    await clickButton(mountList(), 'common.delete')

    expect(routerSpies.delete).toHaveBeenCalledWith('/boats/1/budget/entries/11', {
      preserveScroll: true,
    })
  })
})

describe('BudgetPortStayList', () => {
  const stay = {
    id: 22,
    portId: 3,
    portName: 'Port de Marseille',
    startedAt: '2026-01-01',
    endedAt: null,
    amount: 300,
    notes: null,
  } as BoatPortStayItem

  function mountList() {
    return mountWithStubs(BudgetPortStayList, {
      props: { boatId: 1, stays: [stay], canManage: true },
    })
  }

  test('un refus ne supprime rien', async () => {
    stubDialogs(false)
    await clickButton(mountList(), 'common.delete')

    expect(confirmCalls).toEqual(['budget.portStay.deleteConfirm'])
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('une confirmation supprime le séjour au port', async () => {
    stubDialogs(true)
    await clickButton(mountList(), 'common.delete')

    expect(routerSpies.delete).toHaveBeenCalledWith('/boats/1/port-stays/22', {
      preserveScroll: true,
    })
  })
})

describe('NavigationLogEntryList', () => {
  const entry: NavigationLogEntryRow = {
    id: 33,
    navigationLogId: 5,
    recordedAt: '2026-05-01T10:00:00.000Z',
    latitude: null,
    longitude: null,
    gpsAccuracyM: null,
    cogDeg: null,
    sogKn: null,
    sailConfig: null,
    note: null,
    twdDeg: null,
    twaDeg: null,
    createdAt: '2026-05-01T10:00:00.000Z',
  }

  function mountList() {
    return mountWithStubs(NavigationLogEntryList, {
      props: { boatId: 7, logId: 5, entries: [entry], canEdit: true },
      stubs: { NavigationLogEntryEditForm: { template: '<div />' } },
    })
  }

  test('un refus ne supprime rien', async () => {
    stubDialogs(false)
    await clickButton(mountList(), 'navigation_logs.form.delete')

    expect(confirmCalls).toEqual(['navigation_logs.entries.deleteConfirm'])
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('une confirmation supprime l’entrée imbriquée sous son journal', async () => {
    stubDialogs(true)
    await clickButton(mountList(), 'navigation_logs.form.delete')

    expect(routerSpies.delete).toHaveBeenCalledWith('/boats/7/navigation-logs/5/entries/33', {
      preserveScroll: true,
    })
  })
})

/** Poste occupé ou libre — le pré-contrôle des deux cartes de port. */
function spot(boat: unknown): SpotRow {
  return { id: 1, name: 'A1', positionX: null, positionY: null, boat } as SpotRow
}

describe('PontoonCard', () => {
  function mountCard(spots: SpotRow[]) {
    const pontoon: PontoonRow = {
      id: 8,
      name: 'Ponton A',
      description: null,
      positionX: null,
      positionY: null,
      spots,
    }
    return mountWithStubs(PontoonCard, { props: { pontoon, portId: 3 } })
  }

  test('un ponton occupé alerte, sans même demander confirmation', async () => {
    stubDialogs(true)
    await clickButton(mountCard([spot({ id: 1, name: 'Pen Duick' })]), 'ports.pontoons.delete')

    expect(alertCalls).toEqual(['ports.pontoons.hasBoats'])
    expect(confirmCalls).toEqual([])
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('un refus ne supprime rien', async () => {
    stubDialogs(false)
    await clickButton(mountCard([spot(null)]), 'ports.pontoons.delete')

    expect(confirmCalls).toEqual(['ports.pontoons.deleteConfirm'])
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('une confirmation supprime le ponton — sans options de visite', async () => {
    stubDialogs(true)
    await clickButton(mountCard([spot(null)]), 'ports.pontoons.delete')

    expect(routerSpies.delete).toHaveBeenCalledWith('/ports/3/pontoons/8')
  })
})

describe('MouillageCard', () => {
  function mountCard(spots: SpotRow[]) {
    const mouillage: MouillageRow = {
      id: 4,
      name: 'Mouillage Nord',
      description: null,
      positionX: null,
      positionY: null,
      spots,
    }
    return mountWithStubs(MouillageCard, { props: { mouillage, portId: 3 } })
  }

  test('un mouillage occupé alerte, sans même demander confirmation', async () => {
    stubDialogs(true)
    await clickButton(mountCard([spot({ id: 1, name: 'Pen Duick' })]), 'ports.mouillages.delete')

    expect(alertCalls).toEqual(['ports.mouillages.hasBoats'])
    expect(confirmCalls).toEqual([])
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('une confirmation supprime le mouillage — sans options de visite', async () => {
    stubDialogs(true)
    await clickButton(mountCard([spot(null)]), 'ports.mouillages.delete')

    expect(confirmCalls).toEqual(['ports.mouillages.deleteConfirm'])
    expect(routerSpies.delete).toHaveBeenCalledWith('/ports/3/mouillages/4')
  })
})

describe('BoatMaintenanceSheetCard — garde booléenne lue du template', () => {
  function mountCard() {
    return mountWithStubs(BoatMaintenanceSheetCard, {
      props: {
        boat: { id: 9 } as never,
        sheet: {
          id: 6,
          type: 'entretien',
          title: 'Entretien annuel',
          status: 'in_progress',
          performedAt: '2026-04-01',
          notes: null,
          items: [],
        },
        canManage: true,
      },
      stubs: { BoatMaintenanceSheetItemList: { template: '<div />' } },
    })
  }

  /** Le formulaire de suppression est le dernier du composant. */
  function deleteForm(wrapper: ReturnType<typeof mountCard>) {
    return wrapper.findAll('form').at(-1)!
  }

  test('un refus empêche l’envoi du formulaire de suppression', async () => {
    stubDialogs(false)
    const event = new Event('submit', { cancelable: true })

    deleteForm(mountCard()).element.dispatchEvent(event)

    expect(confirmCalls).toEqual(['boats.sheets.confirmDelete'])
    expect(event.defaultPrevented).toBe(true)
  })

  test('une confirmation laisse le formulaire partir', async () => {
    stubDialogs(true)
    const event = new Event('submit', { cancelable: true })

    deleteForm(mountCard()).element.dispatchEvent(event)

    expect(confirmCalls).toEqual(['boats.sheets.confirmDelete'])
    expect(event.defaultPrevented).toBe(false)
  })
})
