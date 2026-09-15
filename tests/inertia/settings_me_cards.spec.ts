import { describe, expect, test, vi } from 'vitest'
import { Form } from '@adonisjs/inertia/vue'
import type { Component } from 'vue'
import SecurityCard from '../../inertia/components/settings/me/SecurityCard.vue'
import LanguageCard from '../../inertia/components/settings/me/LanguageCard.vue'
import { mountWithStubs } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    name: 'Form',
    props: ['action', 'resetOnSuccess'],
    template: '<form @submit.prevent><slot :processing="false" :errors="{}" /></form>',
  },
}))

/** Les cartes lisent la locale courante dans les props partagées. */
function mountCard(component: Component) {
  return mountWithStubs(component, { locale: 'fr' })
}

describe('SecurityCard', () => {
  test('submits to /settings/password with a PUT', () => {
    const wrapper = mountCard(SecurityCard)
    const form = wrapper.findComponent(Form)
    expect(form.props('action')).toEqual({ url: '/settings/password', method: 'put' })
  })

  test('renders the three password fields', () => {
    const wrapper = mountCard(SecurityCard)
    const names = wrapper.findAll('input').map((i) => i.attributes('name'))
    expect(names).toEqual(['currentPassword', 'password', 'passwordConfirmation'])
    wrapper.findAll('input').forEach((i) => expect(i.attributes('type')).toBe('password'))
  })
})

describe('LanguageCard', () => {
  test('submits to /settings/locale with a PUT', () => {
    const wrapper = mountCard(LanguageCard)
    const form = wrapper.findComponent(Form)
    expect(form.props('action')).toEqual({ url: '/settings/locale', method: 'put' })
  })

  test('preselects the current locale from shared props', () => {
    const wrapper = mountCard(LanguageCard)
    expect(wrapper.find('select[name="locale"]').element).toBeTruthy()
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('fr')
  })
})
