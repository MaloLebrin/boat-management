import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { Form } from '@adonisjs/inertia/vue'
import SecurityCard from '../../inertia/components/settings/me/SecurityCard.vue'
import LanguageCard from '../../inertia/components/settings/me/LanguageCard.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { locale: 'fr' } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    name: 'Form',
    props: ['action', 'resetOnSuccess'],
    template: '<form @submit.prevent><slot :processing="false" :errors="{}" /></form>',
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled'],
  },
}))

vi.mock('~/components/base/BaseCard.vue', () => ({
  default: {
    template: '<div><slot /><slot name="footer" /></div>',
  },
}))

vi.mock('~/components/base/BaseHeading.vue', () => ({
  default: { template: '<h2><slot /></h2>', props: ['level'] },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template: '<input :name="name" :type="type" />',
    props: ['modelValue', 'label', 'errors', 'name', 'type', 'autocomplete', 'hint'],
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template:
      '<select :name="name" :value="modelValue"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'label', 'errors', 'name', 'options'],
    emits: ['update:modelValue'],
  },
}))

describe('SecurityCard', () => {
  test('submits to /settings/password with a PUT', () => {
    const wrapper = mount(SecurityCard)
    const form = wrapper.findComponent(Form)
    expect(form.props('action')).toEqual({ url: '/settings/password', method: 'put' })
  })

  test('renders the three password fields', () => {
    const wrapper = mount(SecurityCard)
    const names = wrapper.findAll('input').map((i) => i.attributes('name'))
    expect(names).toEqual(['currentPassword', 'password', 'passwordConfirmation'])
    wrapper.findAll('input').forEach((i) => expect(i.attributes('type')).toBe('password'))
  })
})

describe('LanguageCard', () => {
  test('submits to /settings/locale with a PUT', () => {
    const wrapper = mount(LanguageCard)
    const form = wrapper.findComponent(Form)
    expect(form.props('action')).toEqual({ url: '/settings/locale', method: 'put' })
  })

  test('preselects the current locale from shared props', () => {
    const wrapper = mount(LanguageCard)
    expect(wrapper.find('select[name="locale"]').element).toBeTruthy()
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('fr')
  })
})
