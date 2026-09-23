import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (value: string) => value }),
}))
vi.mock('@adonisjs/inertia/vue', () => ({ Link: { template: '<a><slot /></a>' } }))
vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    props: ['type', 'variant', 'size'],
    template: '<button :type="type"><slot /></button>',
  },
}))
vi.mock('~/components/boats/incidents/BoatIncidentModal.vue', () => ({
  default: { props: ['open'], template: '<div data-testid="incident-modal" />' },
}))
vi.mock('~/components/boats/incidents/IncidentTargetBadge.vue', () => ({
  default: { template: '<span />' },
}))

import BoatShowTabIncidents from '../../inertia/components/boats/show/tabs/BoatShowTabIncidents.vue'

const boat = { id: 3, name: 'Aventura' } as never

const incident = {
  id: 11,
  occurredAt: '2026-06-01T10:00:00.000Z',
  type: 'engine_failure',
  location: null,
  description: 'Surchauffe',
  insuranceClaimed: false,
  insuranceClaimRef: null,
  status: 'open',
  closedAt: null,
  target: null,
  photosCount: 0,
} as never

function mountTab(rights: { canCreate: boolean; canEdit: boolean; canDelete: boolean }) {
  return mount(BoatShowTabIncidents, { props: { boat, incidents: [incident], ...rights } })
}

function buttons(wrapper: ReturnType<typeof mountTab>) {
  return wrapper.findAll('button').map((button) => button.text())
}

/**
 * L'onglet recevait `canManageMaintenance` (`boats.edit`) pour tout : un
 * membre autorisé par `IncidentPolicy` pouvait ne pas voir le bouton, et
 * inversement (#816). Chaque bouton suit désormais sa propre capacité.
 */
describe('BoatShowTabIncidents — droits par capacité (#816)', () => {
  test('incidents.create seul : déclarer, mais ni modifier ni supprimer', () => {
    const wrapper = mountTab({ canCreate: true, canEdit: false, canDelete: false })

    expect(buttons(wrapper)).toEqual(['incidents.addIncident'])
    expect(wrapper.find('[data-testid="incident-modal"]').exists()).toBe(true)
  })

  test('incidents.edit seul : modifier, sans déclarer', () => {
    const wrapper = mountTab({ canCreate: false, canEdit: true, canDelete: false })

    expect(buttons(wrapper)).toEqual(['incidents.form.edit'])
    expect(wrapper.find('[data-testid="incident-modal"]').exists()).toBe(true)
  })

  test('incidents.delete ne dépend plus de la modification', () => {
    const wrapper = mountTab({ canCreate: false, canEdit: false, canDelete: true })

    expect(buttons(wrapper)).toEqual(['incidents.form.delete'])
    expect(wrapper.find('[data-testid="incident-modal"]').exists()).toBe(false)
  })

  test('sans aucun droit : lecture seule, pas de modale montée', () => {
    const wrapper = mountTab({ canCreate: false, canEdit: false, canDelete: false })

    expect(buttons(wrapper)).toEqual([])
    expect(wrapper.find('[data-testid="incident-modal"]').exists()).toBe(false)
  })
})
