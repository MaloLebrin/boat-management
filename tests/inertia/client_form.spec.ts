import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormPut = vi.hoisted(() => vi.fn())
const mockFormReset = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    navigationPermitNumber: '',
    navigationPermitType: '',
    status: 'active',
    notes: '',
    gdprConsent: false,
    errors: {},
    processing: false,
    post: mockFormPost,
    put: mockFormPut,
    reset: mockFormReset,
  }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseCheckbox.vue', () => ({
  default: {
    template: '<label>{{ label }}<input type="checkbox" :name="name" /></label>',
    props: ['label', 'hint', 'error', 'id', 'name', 'modelValue', 'disabled'],
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template: '<input :name="name" :value="modelValue" />',
    props: ['label', 'modelValue', 'errors', 'errorKey', 'name', 'type', 'required'],
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template: '<select :name="name"><slot /></select>',
    props: ['label', 'modelValue', 'options', 'errors', 'errorKey', 'allowEmpty', 'name'],
  },
}))

vi.mock('~/components/base/BaseTextarea.vue', () => ({
  default: {
    template: '<textarea :name="name"></textarea>',
    props: ['label', 'modelValue', 'errors', 'errorKey', 'name', 'rows'],
  },
}))

import ClientForm from '../../inertia/components/clients/ClientForm.vue'

describe('ClientForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('create mode: submits form.post to /clients', async () => {
    const wrapper = mount(ClientForm)
    await wrapper.find('form').trigger('submit')
    expect(mockFormPost).toHaveBeenCalledWith(
      '/clients',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockFormPut).not.toHaveBeenCalled()
  })

  test('edit mode: submits form.put to /clients/:id', async () => {
    const client = {
      id: 42,
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '+33123456789',
      address: '123 Street',
      navigationPermitNumber: 'ABC123',
      navigationPermitType: 'coastal' as const,
      status: 'active' as const,
      notes: 'Some notes',
      gdprConsentAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }
    const wrapper = mount(ClientForm, { props: { client } })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPut).toHaveBeenCalledWith(
      '/clients/42',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('clicking cancel emits close', async () => {
    const wrapper = mount(ClientForm)
    const cancelButton = wrapper.findAll('button').find((b) => b.attributes('type') === 'button')
    expect(cancelButton).toBeDefined()
    await cancelButton!.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('displays create title when no client prop', () => {
    const wrapper = mount(ClientForm)
    expect(wrapper.text()).toContain('clients.form.createTitle')
  })

  test('renders the GDPR consent checkbox', () => {
    const wrapper = mount(ClientForm)
    expect(wrapper.text()).toContain('clients.gdpr.consentLabel')
    expect(wrapper.find('input[name="gdprConsent"]').exists()).toBe(true)
  })

  test('displays edit title when client prop provided', () => {
    const client = {
      id: 1,
      firstName: 'Jane',
      lastName: 'Smith',
      fullName: 'Jane Smith',
      email: null,
      phone: null,
      address: null,
      navigationPermitNumber: null,
      navigationPermitType: null,
      status: 'active' as const,
      notes: null,
      gdprConsentAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const wrapper = mount(ClientForm, { props: { client } })
    expect(wrapper.text()).toContain('clients.form.editTitle')
  })
})
