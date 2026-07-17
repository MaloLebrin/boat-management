import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BoatListToolbar from '../../inertia/components/boats/list/BoatListToolbar.vue'
import type { BoatListFilters } from '../../inertia/components/boats/list/types'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: { template: '<input />' },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: { template: '<select />' },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

vi.mock('~/components/base/BaseTabs.vue', () => ({
  default: { template: '<div class="base-tabs" />' },
}))

const baseFilters: BoatListFilters = {
  sort: 'recent',
  direction: 'asc',
  page: 1,
  perPage: 20,
}

test('the view toggle no longer stretches across half the row', () => {
  const w = mount(BoatListToolbar, {
    props: {
      filters: baseFilters,
      viewMode: 'table',
      total: 3,
      typeOptions: [],
      propulsionOptions: [],
    },
  })
  const toggleRow = w.get('.base-tabs').element.closest('.flex')
  expect(toggleRow?.className).not.toContain('md:col-span-6')
})
