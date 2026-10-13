import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const deleteMock = vi.hoisted(() => vi.fn())
const network = vi.hoisted(() => ({ online: true }))

vi.mock('~/composables/use_network_status', async () => {
  const { computed } = await import('vue')
  return { useNetworkStatus: () => ({ isOnline: computed(() => network.online) }) }
})

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
  router: { delete: deleteMock },
}))

import DiagnosticResetButton from '../../inertia/components/diagnostic/DiagnosticResetButton.vue'

function mountButton() {
  return mount(DiagnosticResetButton, {
    props: { boatId: 1, engineId: 2, scope: 'fuel' },
  })
}

describe('DiagnosticResetButton (#515)', () => {
  beforeEach(() => {
    deleteMock.mockClear()
    network.online = true
  })

  test('hors-ligne, le bouton est désactivé : un DELETE ne passe pas par la file (#981)', () => {
    network.online = false
    const button = mountButton().get('button')

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('title')).toBe('diagnostic.common.resetOffline')
  })

  test('confirmation acceptée → router.delete avec le scope', async () => {
    const wrapper = mountButton()

    await wrapper.find('button').trigger('click')
    // On déclenche l'événement confirm du modal directement pour ne pas
    // dépendre du libellé du bouton.
    await wrapper.findComponent({ name: 'BaseConfirmModal' }).vm.$emit('confirm')

    expect(deleteMock).toHaveBeenCalledWith('/boats/1/engines/2/diagnostic/checks', {
      data: { scope: 'fuel' },
      preserveScroll: true,
    })
  })

  test("fermer le modal sans confirmer n'appelle pas router.delete", async () => {
    const wrapper = mountButton()

    await wrapper.find('button').trigger('click')
    await wrapper.findComponent({ name: 'BaseConfirmModal' }).vm.$emit('update:open', false)

    expect(deleteMock).not.toHaveBeenCalled()
  })
})
