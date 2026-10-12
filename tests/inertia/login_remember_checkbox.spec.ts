import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import LoginRememberCheckbox from '../../inertia/components/auth/LoginRememberCheckbox.vue'
import { REMEMBER_ME_DAYS } from '../../shared/constants/auth'

/**
 * #951 — la case « rester connecté » est cochée par défaut quand l'app tourne
 * installée (mode standalone) : c'est le cas d'usage traversée, où la session
 * doit survivre des semaines sans réseau. Dans un onglet de navigateur, elle
 * reste décochée (poste partagé, capitainerie).
 */
const mockStandalone = vi.hoisted(() => ({ value: false }))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'auth.login.rememberMe': 'Rester connecté {days} jours',
        'auth.login.rememberMeStandaloneHint':
          "Recommandé sur l'app installée : la synchronisation reprend seule au retour du réseau.",
      },
      locale: 'fr',
    },
  }),
}))

vi.mock('~/composables/use_pwa_install', () => ({
  isStandalone: () => mockStandalone.value,
}))

async function mountCheckbox() {
  const wrapper = mount(LoginRememberCheckbox)
  await flushPromises()
  return wrapper
}

describe('LoginRememberCheckbox (#951)', () => {
  beforeEach(() => {
    mockStandalone.value = false
  })

  test('renders the remember checkbox with the configured duration', async () => {
    const wrapper = await mountCheckbox()
    const input = wrapper.find('input[type="checkbox"]')

    expect(input.attributes('name')).toBe('remember')
    expect(wrapper.text()).toContain(`Rester connecté ${REMEMBER_ME_DAYS} jours`)
  })

  test('is unchecked by default in a browser tab', async () => {
    const wrapper = await mountCheckbox()

    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.find('[data-test="remember-standalone-hint"]').exists()).toBe(false)
  })

  test('is checked by default and explains why when the PWA is installed', async () => {
    mockStandalone.value = true
    const wrapper = await mountCheckbox()

    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('[data-test="remember-standalone-hint"]').text()).toContain('Recommandé')
  })

  test('the user can still opt out when installed', async () => {
    mockStandalone.value = true
    const wrapper = await mountCheckbox()

    await wrapper.find('input').setValue(false)

    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false)
  })
})
