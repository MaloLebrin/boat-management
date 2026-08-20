import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import QuickAddIncidentModal from '../../inertia/components/navigation/QuickAddIncidentModal.vue'
import type { FleetBoatOption } from '../../shared/types/navigation'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    template: '<div v-if="open"><slot /></div>',
    props: ['open', 'title', 'subtitle', 'closeLabel', 'size'],
    emits: ['update:open'],
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template:
      '<select :value="modelValue" :name="name" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">{{ placeholder }}</option><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'label', 'placeholder', 'name', 'options'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/boats/show/tabs/BoatIncidentForm.vue', () => ({
  default: {
    template: '<div class="incident-form" @click="$emit(\'close\')">{{ boatId }}</div>',
    props: ['boatId', 'editingIncident'],
    emits: ['close'],
  },
}))

const boats: FleetBoatOption[] = [
  { id: 1, name: 'Mistral' },
  { id: 2, name: 'Zephyr' },
]

describe('QuickAddIncidentModal', () => {
  test('does not render the form before a boat is selected', () => {
    const wrapper = mount(QuickAddIncidentModal, { props: { open: true, boats } })
    expect(wrapper.find('.incident-form').exists()).toBe(false)
  })

  test('renders the form with the selected boat id once a boat is chosen', async () => {
    const wrapper = mount(QuickAddIncidentModal, { props: { open: true, boats } })
    await wrapper.find('select').setValue('2')
    expect(wrapper.find('.incident-form').exists()).toBe(true)
    expect(wrapper.find('.incident-form').text()).toBe('2')
  })

  test('defaultBoatId pre-selects the boat and shows the form immediately', () => {
    const wrapper = mount(QuickAddIncidentModal, {
      props: { open: true, boats, defaultBoatId: 1 },
    })
    expect(wrapper.find('.incident-form').exists()).toBe(true)
    expect(wrapper.find('.incident-form').text()).toBe('1')
  })

  test('closing the form resets the boat selection and emits update:open(false)', async () => {
    const wrapper = mount(QuickAddIncidentModal, {
      props: { open: true, boats, defaultBoatId: 1 },
    })
    await wrapper.find('.incident-form').trigger('click')
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})
