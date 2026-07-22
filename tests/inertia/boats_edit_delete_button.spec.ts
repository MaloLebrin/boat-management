import { mount } from '@vue/test-utils'
import { test, expect, vi, beforeEach } from 'vitest'

const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    Head: { template: '<div><slot /></div>' },
    usePage: vi.fn(),
    router: { delete: mockDelete },
  }
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" :errors="{}" /></form>' },
}))

vi.mock('~/components/boats/hull/BoatFormHullFields.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/BoatOwnersManager.vue', () => ({
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

import { usePage } from '@inertiajs/vue3'
import BoatsEdit from '../../inertia/pages/boats/edit.vue'
import type { Capability } from '../../shared/types/permissions'

const boat = {
  id: 1,
  name: 'Sea Breeze',
  registrationNumber: null,
  type: null,
  manufacturedAt: null,
  propulsionType: null,
  lengthM: null,
  beamM: null,
  draftM: null,
  mastHeightM: null,
  hullMaterial: null,
  yearBuilt: null,
  manufacturer: null,
  model: null,
  homePort: null,
  navigationCategory: null,
  hullIdentificationNumber: null,
  francisationNumber: null,
  flagCountry: null,
  maxPersons: null,
  mmsi: null,
  imoNumber: null,
  spotId: null,
}

function mountEdit(capabilities: Capability[]) {
  vi.mocked(usePage).mockReturnValue({
    props: { permissions: { role: 'member', capabilities } },
  } as ReturnType<typeof usePage>)

  return mount(BoatsEdit, {
    props: { boat, ports: [], owners: [], ownerCandidates: [] },
  })
}

beforeEach(() => {
  mockDelete.mockClear()
})

test('a user with boats.delete sees the delete button', () => {
  const w = mountEdit(['boats.edit', 'boats.delete'])
  expect(w.text()).toContain('common.delete')
})

test('a member without boats.delete does not see the delete button (#397)', () => {
  const w = mountEdit(['boats.edit'])
  expect(w.text()).not.toContain('common.delete')
})

test('clicking delete opens a confirmation modal without deleting immediately (#398)', async () => {
  const w = mountEdit(['boats.edit', 'boats.delete'])
  expect(w.find('.confirm-modal').exists()).toBe(false)

  const deleteButton = w.findAll('button').find((b) => b.text() === 'common.delete')
  await deleteButton!.trigger('click')

  expect(w.find('.confirm-modal').exists()).toBe(true)
  expect(mockDelete).not.toHaveBeenCalled()
})

test('confirming the modal deletes the boat (#398)', async () => {
  const w = mountEdit(['boats.edit', 'boats.delete'])
  const deleteButton = w.findAll('button').find((b) => b.text() === 'common.delete')
  await deleteButton!.trigger('click')

  await w.find('.confirm-btn').trigger('click')

  expect(mockDelete).toHaveBeenCalledWith('/boats/1', expect.objectContaining({}))
})
