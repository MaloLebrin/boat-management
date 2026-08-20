import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { Form } from '@adonisjs/inertia/vue'
import BoatIncidentForm from '../../inertia/components/boats/show/tabs/BoatIncidentForm.vue'
import type { BoatIncidentRow } from '../../inertia/types/boat_show'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    name: 'Form',
    props: ['action'],
    template: '<form @submit.prevent><slot :processing="false" :errors="{}" /></form>',
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled'],
    emits: ['click'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template: '<input :value="modelValue" :name="name" />',
    props: ['modelValue', 'label', 'errors', 'error', 'name', 'type', 'id', 'required', 'class'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template:
      '<select :value="modelValue" :name="name"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'label', 'errors', 'error', 'name', 'options', 'id', 'required'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseTextarea.vue', () => ({
  default: {
    template: '<textarea :value="modelValue" :name="name" />',
    props: ['modelValue', 'label', 'errors', 'name', 'rows', 'required', 'class'],
    emits: ['update:modelValue'],
  },
}))

const sampleIncident: BoatIncidentRow = {
  id: 42,
  type: 'grounding',
  status: 'open',
  occurredAt: '2026-06-25T10:00:00.000Z',
  location: 'Port',
  description: 'Test incident',
  insuranceClaimed: false,
  insuranceClaimRef: null,
}

describe('BoatIncidentForm', () => {
  test('create mode: Form action posts to /boats/{boatId}/incidents', () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null },
    })
    const form = wrapper.findComponent(Form)
    expect(form.props('action')).toEqual({ url: '/boats/7/incidents', method: 'post' })
  })

  test('edit mode: Form action puts to /boats/{boatId}/incidents/{id}', () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: sampleIncident },
    })
    const form = wrapper.findComponent(Form)
    expect(form.props('action')).toEqual({ url: '/boats/7/incidents/42', method: 'put' })
  })

  test('cancel button emits close', async () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null },
    })
    await wrapper.find('button[type="button"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
