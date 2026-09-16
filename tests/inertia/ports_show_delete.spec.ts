import { beforeEach, expect, test, vi } from 'vitest'
import type { MouillageRow, PontoonRow, PortShowDetail, SpotRow } from '../../inertia/types/port'
import PortsShow from '../../inertia/pages/ports/show.vue'
import { mountWithStubs, routerSpies } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

/** Les onglets ne sont pas l'objet de la spec : seule la suppression compte. */
const PAGE_STUBS = {
  BaseTabs: { template: '<div />' },
  MarinaMapTab: { template: '<div />' },
  PortListTab: { template: '<div />' },
}

function makePort(overrides: Partial<PortShowDetail> = {}): PortShowDetail {
  return {
    id: 7,
    name: 'Port Test',
    city: null,
    country: null,
    address: null,
    notes: null,
    pontoons: [],
    mouillages: [],
    ...overrides,
  }
}

function mountShow(port: PortShowDetail = makePort()) {
  return mountWithStubs(PortsShow, { props: { port, boats: [] }, stubs: PAGE_STUBS })
}

beforeEach(() => {
  window.alert = vi.fn()
})

test('clicking delete opens a confirmation modal without deleting immediately (#398)', async () => {
  const w = mountShow()
  expect(w.find('[data-base-confirm-modal]').exists()).toBe(false)

  const deleteButton = w.findAll('button').find((b) => b.text().includes('common.delete'))
  await deleteButton!.trigger('click')

  expect(w.find('[data-base-confirm-modal]').exists()).toBe(true)
  expect(routerSpies.delete).not.toHaveBeenCalled()
})

test('confirming the modal deletes the port (#398)', async () => {
  const w = mountShow(makePort({ id: 9 }))
  const deleteButton = w.findAll('button').find((b) => b.text().includes('common.delete'))
  await deleteButton!.trigger('click')

  await w.find('[data-confirm]').trigger('click')

  expect(routerSpies.delete).toHaveBeenCalledWith('/ports/9')
})

/**
 * Un bateau est rattaché à une **place**, jamais au ponton : `PontoonRow` /
 * `MouillageRow` exposent `spots[].boat`, pas de `boats`. La garde de
 * `handleDeletePort` lisait `p.boats.length` — ces fixtures reprennent donc la
 * forme réellement envoyée par `PortService.getWithPontoonsAndMouillagesOrFail`.
 */
function makePontoon(spots: SpotRow[]): PontoonRow {
  return { id: 1, name: 'Ponton A', description: null, positionX: null, positionY: null, spots }
}

function makeMouillage(spots: SpotRow[]): MouillageRow {
  return {
    id: 2,
    name: 'Corps-morts',
    description: null,
    positionX: null,
    positionY: null,
    spots,
  }
}

function makeSpot(name: string, boat: SpotRow['boat'] = null): SpotRow {
  return { id: name.charCodeAt(0) + name.length, name, description: null, boat }
}

test('a port with a boat moored on a pontoon spot shows an alert instead of the confirmation modal', async () => {
  const w = mountShow(
    makePort({
      pontoons: [makePontoon([makeSpot('A01'), makeSpot('A02', { id: 1, name: 'Sea Breeze' })])],
    })
  )
  const deleteButton = w.findAll('button').find((b) => b.text().includes('common.delete'))
  await deleteButton!.trigger('click')

  expect(w.find('[data-base-confirm-modal]').exists()).toBe(false)
  expect(window.alert).toHaveBeenCalledWith('ports.hasBoats')
  expect(routerSpies.delete).not.toHaveBeenCalled()
})

test('a port with a boat moored on a mouillage spot shows an alert instead of the confirmation modal', async () => {
  const w = mountShow(
    makePort({
      mouillages: [makeMouillage([makeSpot('B08', { id: 3, name: 'Albatros' })])],
    })
  )
  const deleteButton = w.findAll('button').find((b) => b.text().includes('common.delete'))
  await deleteButton!.trigger('click')

  expect(w.find('[data-base-confirm-modal]').exists()).toBe(false)
  expect(window.alert).toHaveBeenCalledWith('ports.hasBoats')
  expect(routerSpies.delete).not.toHaveBeenCalled()
})

test('a port whose pontoons and mouillages are all free still opens the confirmation modal', async () => {
  const w = mountShow(
    makePort({
      pontoons: [makePontoon([makeSpot('A01'), makeSpot('A02')])],
      mouillages: [makeMouillage([makeSpot('B08')])],
    })
  )
  const deleteButton = w.findAll('button').find((b) => b.text().includes('common.delete'))
  await deleteButton!.trigger('click')

  expect(w.find('[data-base-confirm-modal]').exists()).toBe(true)
  expect(window.alert).not.toHaveBeenCalled()
  expect(routerSpies.delete).not.toHaveBeenCalled()
})
