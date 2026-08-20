import { mount } from '@vue/test-utils'
import { beforeEach, test, expect, vi } from 'vitest'
import type { MouillageRow, PontoonRow, PortShowDetail, SpotRow } from '../../inertia/types/port'

const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  router: { delete: mockDelete },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

vi.mock('~/components/base/BaseTabs.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/ports/show/tabs/MarinaMapTab.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/ports/show/tabs/PortListTab.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/base/BaseConfirmModal.vue', () => ({
  default: {
    template:
      '<div v-if="open" class="confirm-modal"><button class="confirm-btn" @click="$emit(\'confirm\')">{{ confirmLabel }}</button></div>',
    props: ['open', 'title', 'message', 'confirmLabel', 'cancelLabel'],
    emits: ['update:open', 'confirm'],
  },
}))

import PortsShow from '../../inertia/pages/ports/show.vue'

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
  return mount(PortsShow, { props: { port, boats: [] } })
}

beforeEach(() => {
  mockDelete.mockClear()
  window.alert = vi.fn()
})

test('clicking delete opens a confirmation modal without deleting immediately (#398)', async () => {
  const w = mountShow()
  expect(w.find('.confirm-modal').exists()).toBe(false)

  const deleteButton = w.findAll('button').find((b) => b.text().includes('common.delete'))
  await deleteButton!.trigger('click')

  expect(w.find('.confirm-modal').exists()).toBe(true)
  expect(mockDelete).not.toHaveBeenCalled()
})

test('confirming the modal deletes the port (#398)', async () => {
  const w = mountShow(makePort({ id: 9 }))
  const deleteButton = w.findAll('button').find((b) => b.text().includes('common.delete'))
  await deleteButton!.trigger('click')

  await w.find('.confirm-btn').trigger('click')

  expect(mockDelete).toHaveBeenCalledWith('/ports/9')
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

  expect(w.find('.confirm-modal').exists()).toBe(false)
  expect(window.alert).toHaveBeenCalledWith('ports.hasBoats')
  expect(mockDelete).not.toHaveBeenCalled()
})

test('a port with a boat moored on a mouillage spot shows an alert instead of the confirmation modal', async () => {
  const w = mountShow(
    makePort({
      mouillages: [makeMouillage([makeSpot('B08', { id: 3, name: 'Albatros' })])],
    })
  )
  const deleteButton = w.findAll('button').find((b) => b.text().includes('common.delete'))
  await deleteButton!.trigger('click')

  expect(w.find('.confirm-modal').exists()).toBe(false)
  expect(window.alert).toHaveBeenCalledWith('ports.hasBoats')
  expect(mockDelete).not.toHaveBeenCalled()
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

  expect(w.find('.confirm-modal').exists()).toBe(true)
  expect(window.alert).not.toHaveBeenCalled()
  expect(mockDelete).not.toHaveBeenCalled()
})
