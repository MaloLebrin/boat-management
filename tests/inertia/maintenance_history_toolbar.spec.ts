import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import MaintenanceHistoryToolbar from '../../inertia/components/maintenance/MaintenanceHistoryToolbar.vue'
import type { MaintenanceHistoryFilters } from '../../shared/types/maintenance'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    props: ['modelValue', 'label', 'type'],
    template: '<div class="base-input" :data-label="label"><input :value="modelValue" /></div>',
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    props: ['modelValue', 'label', 'options'],
    template: '<div class="base-select" :data-label="label" />',
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

const baseFilters: MaintenanceHistoryFilters = {
  q: '',
  subject: '',
  boatId: null,
  dateFrom: '',
  dateTo: '',
  sort: 'recent',
  page: 1,
  perPage: 20,
}

test('search field and subject select do not share the same label', () => {
  const w = mount(MaintenanceHistoryToolbar, {
    props: { filters: baseFilters, boatOptions: [], total: 0 },
  })
  const inputLabel = w.get('.base-input').attributes('data-label')
  const selectLabels = w.findAll('.base-select').map((s) => s.attributes('data-label'))
  expect(inputLabel).toBe('maintenance.history.filterBar.searchLabel')
  expect(selectLabels).toContain('maintenance.history.filterBar.subjectLabel')
  expect(inputLabel).not.toBe('maintenance.history.filterBar.subjectLabel')
})
