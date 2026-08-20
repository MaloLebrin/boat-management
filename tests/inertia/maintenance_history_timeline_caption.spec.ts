import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import MaintenanceHistoryTimeline from '../../inertia/components/maintenance/MaintenanceHistoryTimeline.vue'
import type { MaintenanceEventRow } from '../../shared/types/maintenance'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: { 'boats.options.engineKind.inboard': 'In-bord' },
      locale: 'fr',
    },
  }),
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span><slot /></span>', props: ['variant'] },
}))

function makeEvent(overrides: Partial<MaintenanceEventRow>): MaintenanceEventRow {
  return {
    id: 1,
    boatId: 1,
    boatName: 'Bora Bora',
    subject: 'engine',
    title: 'Vidange',
    notes: null,
    performedAt: '2026-01-15',
    engineCaption: null,
    sailCaption: null,
    boatEngineId: 7,
    boatSailId: null,
    boatRigId: null,
    boatSafetyEquipmentId: null,
    parts: [],
    totalCost: null,
    ...overrides,
  }
}

describe('MaintenanceHistoryTimeline', () => {
  test('translates an engine caption that is a raw kind token (#472)', () => {
    const wrapper = mount(MaintenanceHistoryTimeline, {
      props: { events: [makeEvent({ engineCaption: 'inboard' })] },
    })

    expect(wrapper.text()).toContain('In-bord')
    expect(wrapper.text()).not.toContain('inboard')
  })

  test('leaves a free-text engine caption untouched', () => {
    const wrapper = mount(MaintenanceHistoryTimeline, {
      props: { events: [makeEvent({ engineCaption: 'Volvo Penta D2-40' })] },
    })

    expect(wrapper.text()).toContain('Volvo Penta D2-40')
  })

  test('still falls back to the sail caption for a sail event', () => {
    const wrapper = mount(MaintenanceHistoryTimeline, {
      props: {
        events: [makeEvent({ subject: 'sail', boatEngineId: null, sailCaption: 'Génois' })],
      },
    })

    expect(wrapper.text()).toContain('Génois')
  })
})
