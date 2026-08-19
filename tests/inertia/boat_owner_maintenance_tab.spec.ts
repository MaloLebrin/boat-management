import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import BoatOwnerMaintenanceTab from '../../inertia/components/owner/BoatOwnerMaintenanceTab.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'boats.options.engineKind.inboard': 'In-bord',
        'maintenance.subjects.engine': 'Moteur',
      },
      locale: 'fr',
    },
  }),
}))

function makeEvent(engineCaption: string | null) {
  return {
    id: 1,
    title: 'Vidange',
    subject: 'engine',
    notes: null,
    performedAt: '2026-01-01',
    engineCaption,
    sailCaption: null,
  }
}

function renderedText(engineCaption: string | null): string {
  const wrapper = mount(BoatOwnerMaintenanceTab, { props: { events: [makeEvent(engineCaption)] } })
  return wrapper.text().replace(/\s+/g, ' ')
}

describe('BoatOwnerMaintenanceTab', () => {
  test('translates an engine caption that is a raw kind token (#472)', () => {
    const text = renderedText('inboard')

    expect(text).toContain('Moteur · In-bord')
    expect(text).not.toContain('inboard')
  })

  test('leaves a free-text engine caption untouched', () => {
    expect(renderedText('Volvo Penta D2-40')).toContain('Moteur · Volvo Penta D2-40')
  })
})
