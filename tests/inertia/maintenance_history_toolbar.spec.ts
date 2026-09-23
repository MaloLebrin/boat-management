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

const selectLabels = (w: ReturnType<typeof mount>) =>
  w.findAll('.base-select').map((s) => s.attributes('data-label'))

test('offers the boat filter when the org has several boats', () => {
  const w = mount(MaintenanceHistoryToolbar, {
    props: {
      filters: baseFilters,
      boatOptions: [
        { id: 1, name: 'Mistral' },
        { id: 2, name: 'Zephyr' },
      ],
      total: 0,
    },
  })
  expect(selectLabels(w)).toContain('maintenance.history.filterBar.boatLabel')
})

test('hides the boat filter for a single-boat fleet, keeping the other filters (#823)', () => {
  const w = mount(MaintenanceHistoryToolbar, {
    props: { filters: baseFilters, boatOptions: [{ id: 1, name: 'Mistral' }], total: 0 },
  })
  const labels = selectLabels(w)
  expect(labels).not.toContain('maintenance.history.filterBar.boatLabel')
  expect(labels).toContain('maintenance.history.filterBar.subjectLabel')
  expect(labels).toContain('maintenance.history.filterBar.sortLabel')
})
