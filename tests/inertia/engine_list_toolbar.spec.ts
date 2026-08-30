import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import EngineListToolbar from '../../inertia/components/engines/list/EngineListToolbar.vue'
import type { EngineListFilters } from '../../shared/types/engine'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: { template: '<input />' },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    props: ['label', 'modelValue', 'options', 'allowEmpty', 'placeholder'],
    template: '<select :aria-label="label" />',
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

vi.mock('~/components/base/BaseTabs.vue', () => ({
  default: { template: '<div class="base-tabs" />' },
}))

const baseFilters: EngineListFilters = {
  q: '',
  boatId: 0,
  kind: '',
  status: '',
  family: '',
  sort: 'recent',
  direction: 'desc',
  page: 1,
  perPage: 20,
}

function mountToolbar(
  overrides: Partial<EngineListFilters> = {},
  boatOptions = [
    { id: 1, name: 'Alizé' },
    { id: 2, name: 'Bora' },
  ]
) {
  return mount(EngineListToolbar, {
    props: {
      filters: { ...baseFilters, ...overrides },
      viewMode: 'table' as const,
      total: 3,
      boatOptions,
    },
  })
}

test('passes the total as count to the engines label for correct pluralization', () => {
  const w = mountToolbar()

  expect(w.text()).toContain('engines.list.engines:{"count":"3"}')
})

test('offers the boat filter only when the org has more than one boat', () => {
  const many = mountToolbar()
  expect(
    many.findAll('select').some((s) => s.attributes('aria-label') === 'engines.list.boat')
  ).toBe(true)

  const single = mountToolbar({}, [{ id: 1, name: 'Alizé' }])
  expect(
    single.findAll('select').some((s) => s.attributes('aria-label') === 'engines.list.boat')
  ).toBe(false)
})

test('hides the reset button until a filter is active', async () => {
  expect(mountToolbar().find('button').exists()).toBe(false)

  // Le filtre « bateau » compte comme filtre actif au même titre que la
  // recherche : sans lui, on ne pourrait plus revenir à toute la flotte.
  expect(mountToolbar({ boatId: 2 }).find('button').exists()).toBe(true)
  expect(mountToolbar({ q: 'yamaha' }).find('button').exists()).toBe(true)
  expect(mountToolbar({ status: 'retired' }).find('button').exists()).toBe(true)
})

test('emits the reset event when the clear button is clicked', async () => {
  const w = mountToolbar({ kind: 'outboard' })

  await w.get('button').trigger('click')

  expect(w.emitted('reset')).toHaveLength(1)
})
