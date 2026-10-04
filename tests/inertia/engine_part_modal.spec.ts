import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    props: ['open', 'title'],
    template: '<div v-if="open"><slot /></div>',
  },
}))
vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    props: ['action'],
    template:
      '<form :data-url="action.url" :data-method="action.method"><slot :processing="false" :errors="{}" /></form>',
  },
  Link: { template: '<a><slot /></a>' },
}))

import EnginePartModal from '../../inertia/components/engine/show/EnginePartModal.vue'
import type { BoatShowEnginePart } from '../../inertia/types/boat_show'

const part: BoatShowEnginePart = {
  id: 9,
  designation: 'Impeller',
  reference: 'JAB-1',
  stock: 4,
  minStockAlert: 2,
  supplier: null,
  notes: null,
  wearState: null,
  documents: [],
  photos: [],
  purchasePrice: null,
  purchasedAt: null,
  inventoryItem: null,
}

function thresholdInput(w: ReturnType<typeof mount>) {
  return w.find<HTMLInputElement>('input[name="minStockAlert"]')
}

test('editing prefills the alert threshold posted as minStockAlert (#947)', async () => {
  const w = mount(EnginePartModal, {
    props: { open: false, boatId: 3, engineId: 5, editingPart: part },
  })
  await w.setProps({ open: true })

  const input = thresholdInput(w)
  expect(input.exists()).toBe(true)
  expect(input.attributes('type')).toBe('number')
  expect(input.attributes('min')).toBe('0')
  expect(input.element.value).toBe('2')
  expect(w.find('form').attributes('data-url')).toBe('/boats/3/engines/5/parts/9')
  expect(w.find('form').attributes('data-method')).toBe('put')
})

test('a part without threshold opens with an empty field', async () => {
  const w = mount(EnginePartModal, {
    props: { open: false, boatId: 3, engineId: 5, editingPart: { ...part, minStockAlert: null } },
  })
  await w.setProps({ open: true })

  expect(thresholdInput(w).element.value).toBe('')
})

test('adding a part resets the threshold field', async () => {
  const w = mount(EnginePartModal, {
    props: { open: false, boatId: 3, engineId: 5, editingPart: part },
  })
  await w.setProps({ open: true })
  await w.setProps({ open: false, editingPart: null })
  await w.setProps({ open: true })

  expect(thresholdInput(w).element.value).toBe('')
  expect(w.find('form').attributes('data-method')).toBe('post')
})
