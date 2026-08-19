import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'boats.options.engineKind.inboard': 'In-bord',
        'maintenance.history.subjects.engine': 'Moteur',
      },
      locale: 'fr',
    },
  }),
  router: { patch: vi.fn(), post: vi.fn() },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" /></form>' },
  Link: { template: '<a><slot /></a>' },
}))

import BoatShowTabHistory from '../../inertia/components/boats/show/tabs/BoatShowTabHistory.vue'
import type { MaintenanceEventRow } from '../../inertia/types/boat_show'

const boat = { id: 13, name: 'Aventura', engines: [], sails: [] } as never

const globalStubs = { global: { stubs: { teleport: true, transition: true } } }

function makeEvent(engineCaption: string | null): MaintenanceEventRow {
  return {
    id: 1,
    subject: 'engine',
    title: 'Vidange',
    notes: null,
    performedAt: '2026-01-15',
    engineCaption,
    sailCaption: null,
    boatEngineId: 7,
    boatSailId: null,
    boatRigId: null,
    parts: [],
  }
}

function renderedText(engineCaption: string | null): string {
  const wrapper = mount(BoatShowTabHistory, {
    props: {
      boat,
      maintenanceEvents: [makeEvent(engineCaption)],
      canManageMaintenance: true,
      canExport: false,
      createIntent: null,
    },
    ...globalStubs,
  })
  return wrapper.text().replace(/\s+/g, ' ')
}

describe('BoatShowTabHistory — engine caption (#472)', () => {
  test('translates a caption that fell back to the raw engine kind token', () => {
    const text = renderedText('inboard')

    expect(text).toContain('Moteur · In-bord')
    expect(text).not.toContain('inboard')
  })

  test('leaves a free-text caption untouched', () => {
    expect(renderedText('Volvo Penta D2-40')).toContain('Moteur · Volvo Penta D2-40')
  })

  test('shows the subject alone when the event carries no caption', () => {
    const text = renderedText(null)

    expect(text).toContain('Moteur')
    expect(text).not.toContain('·')
  })
})
