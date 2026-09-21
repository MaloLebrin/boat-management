import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    props: ['open', 'title'],
    template: '<div v-if="open" :data-title="title"><slot /></div>',
  },
}))
vi.mock('~/components/boats/show/tabs/BoatIncidentForm.vue', () => ({
  default: {
    props: ['boatId', 'editingIncident', 'equipment', 'prefill', 'lockTarget'],
    template:
      '<div data-testid="incident-form" :data-boat="boatId" :data-lock="String(lockTarget)" :data-target="prefill ? prefill.target.type + \':\' + prefill.target.id : \'\'" />',
  },
}))

import BoatIncidentModal from '../../inertia/components/boats/incidents/BoatIncidentModal.vue'
import EquipmentIncidentAction from '../../inertia/components/boats/incidents/EquipmentIncidentAction.vue'

test('mounts the form only when open, with the locked target forwarded (#813)', async () => {
  const w = mount(BoatIncidentModal, {
    props: {
      open: false,
      boatId: 7,
      prefill: { target: { type: 'engine', id: 12 } },
      lockTarget: true,
    },
  })
  expect(w.find('[data-testid="incident-form"]').exists()).toBe(false)

  await w.setProps({ open: true })

  const form = w.find('[data-testid="incident-form"]')
  expect(form.attributes('data-boat')).toBe('7')
  expect(form.attributes('data-lock')).toBe('true')
  expect(form.attributes('data-target')).toBe('engine:12')
  expect(w.find('[data-title]').attributes('data-title')).toBe('incidents.modalTitle')
})

test('editing an incident switches the title', () => {
  const w = mount(BoatIncidentModal, {
    props: { open: true, boatId: 7, editingIncident: { id: 42 } as never },
  })

  expect(w.find('[data-title]').attributes('data-title')).toBe('incidents.form.editTitle')
})

test('EquipmentIncidentAction opens a modal locked on its target, hidden without the right', async () => {
  const hidden = mount(EquipmentIncidentAction, {
    props: { boatId: 7, target: { type: 'engine_part', id: 3 }, canReport: false },
  })
  expect(hidden.find('[data-testid="equipment-report-incident"]').exists()).toBe(false)

  const w = mount(EquipmentIncidentAction, {
    props: {
      boatId: 7,
      target: { type: 'engine_part', id: 3 },
      targetLabel: 'Bougie NGK',
      canReport: true,
    },
  })
  expect(w.find('[data-testid="incident-form"]').exists()).toBe(false)

  await w.find('[data-testid="equipment-report-incident"]').trigger('click')

  const form = w.find('[data-testid="incident-form"]')
  expect(form.attributes('data-target')).toBe('engine_part:3')
  expect(form.attributes('data-lock')).toBe('true')
})
