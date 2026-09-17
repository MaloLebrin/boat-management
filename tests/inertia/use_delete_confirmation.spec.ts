import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { resetInertiaMock, routerSpies } from './helpers/inertia_mock'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

import {
  useDeleteConfirmation,
  type UseDeleteConfirmationOptions,
} from '../../inertia/composables/use_delete_confirmation'

function mountComposable(options: UseDeleteConfirmationOptions) {
  let result: ReturnType<typeof useDeleteConfirmation> | undefined
  mount(
    defineComponent({
      setup() {
        result = useDeleteConfirmation(options)
        return {}
      },
      template: '<div />',
    })
  )
  return result!
}

beforeEach(() => {
  resetInertiaMock()
})

describe('useDeleteConfirmation', () => {
  test('la modale est fermée avant toute demande', () => {
    expect(mountComposable({ url: () => '/ports/9' }).isOpen.value).toBe(false)
  })

  test('`ask` ouvre sans rien envoyer', () => {
    const deletion = mountComposable({ url: () => '/ports/9' })

    deletion.ask()

    expect(deletion.isOpen.value).toBe(true)
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('`release` referme sans rien envoyer', () => {
    const deletion = mountComposable({ url: () => '/ports/9' })
    deletion.ask()

    deletion.release()

    expect(deletion.isOpen.value).toBe(false)
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('`confirm` supprime puis referme', () => {
    const deletion = mountComposable({
      url: () => '/invoices/42',
      visit: { preserveScroll: true },
    })
    deletion.ask()

    deletion.confirm()

    expect(routerSpies.delete).toHaveBeenCalledWith('/invoices/42', { preserveScroll: true })
    expect(deletion.isOpen.value).toBe(false)
  })

  test('sans options, la visite part à un seul argument', () => {
    mountComposable({ url: () => '/ports/9' }).confirm()

    // La page port n'en passait aucune : sa signature reste la sienne.
    expect(routerSpies.delete).toHaveBeenCalledWith('/ports/9')
  })

  test('l’URL est calculée au moment de confirmer, pas à l’appel du composable', () => {
    let id = 1
    const deletion = mountComposable({ url: () => `/boats/${id}` })

    id = 7
    deletion.confirm()

    expect(routerSpies.delete).toHaveBeenCalledWith('/boats/7')
  })
})
