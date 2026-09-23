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
vi.mock('~/components/boats/maintenance/BoatMaintenanceTaskModal.vue', () => ({
  default: {
    name: 'BoatMaintenanceTaskModal',
    props: ['open', 'prefill', 'lockEquipment'],
    template: '<div data-testid="task-modal" :data-open="String(open)" />',
  },
}))
vi.mock('~/components/boats/equipment-actions/BoatEquipmentActionModal.vue', () => ({
  default: {
    name: 'BoatEquipmentActionModal',
    props: ['open', 'prefill'],
    template: '<div data-testid="action-modal" :data-open="String(open)" />',
  },
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

function mountTab(
  rights: { canCreate: boolean; canEdit: boolean; canDelete: boolean },
  extra: Record<string, unknown> = {}
) {
  return mount(BoatShowTabIncidents, {
    props: { boat, incidents: [incident], ...rights, ...extra },
  })
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

/**
 * Suites d'un incident (#815) : « Créer une tâche » et « Action à réparer »
 * suivent `maintenance.create` / `equipmentActions.create`, et le badge
 * « n suites » attend les listes différées avant de compter.
 */
describe('BoatShowTabIncidents — suites (#815)', () => {
  const noRights = { canCreate: false, canEdit: false, canDelete: false }

  test('sans les droits : ni boutons de suite ni modales de tâche/action', () => {
    const wrapper = mountTab(noRights)

    expect(buttons(wrapper)).toEqual([])
    expect(wrapper.find('[data-testid="task-modal"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="action-modal"]').exists()).toBe(false)
  })

  test('« Créer une tâche » ouvre la modale de tâche pré-remplie sur l’incident', async () => {
    const wrapper = mountTab(noRights, { canCreateTask: true, canCreateAction: true })

    expect(buttons(wrapper)).toEqual([
      'incidents.followUps.createTask',
      'incidents.followUps.createAction',
    ])
    await wrapper.find('[data-testid="incident-create-task"]').trigger('click')

    const modal = wrapper.findComponent({ name: 'BoatMaintenanceTaskModal' })
    expect(modal.props('open')).toBe(true)
    expect(modal.props('prefill')).toEqual({
      title: 'incidents.type.engine_failure',
      boatIncidentId: 11,
    })
    expect(modal.props('lockEquipment')).toBe(false)
  })

  test('« Action à réparer » ouvre la modale d’action pré-remplie', async () => {
    const wrapper = mountTab(noRights, { canCreateAction: true })

    await wrapper.find('[data-testid="incident-create-action"]').trigger('click')

    const modal = wrapper.findComponent({ name: 'BoatEquipmentActionModal' })
    expect(modal.props('open')).toBe(true)
    expect(modal.props('prefill')).toEqual({
      label: 'incidents.type.engine_failure',
      actionType: 'to_repair',
      boatIncidentId: 11,
    })
  })

  test('le badge « n suites » compte tâches et actions de l’incident, une fois chargées', () => {
    const pending = mountTab(noRights, { maintenanceTasks: [{ boatIncidentId: 11 }] })
    expect(pending.find('[data-testid="incident-follow-ups-count"]').exists()).toBe(false)

    const loaded = mountTab(noRights, {
      maintenanceTasks: [{ boatIncidentId: 11 }, { boatIncidentId: 99 }],
      equipmentActions: [{ boatIncidentId: 11 }],
    })
    expect(loaded.find('[data-testid="incident-follow-ups-count"]').text()).toContain(
      'incidents.followUps.count'
    )

    const none = mountTab(noRights, { maintenanceTasks: [], equipmentActions: [] })
    expect(none.find('[data-testid="incident-follow-ups-count"]').exists()).toBe(false)
  })
})
