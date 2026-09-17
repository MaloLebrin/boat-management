import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { resetInertiaMock, routerSpies } from './helpers/inertia_mock'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

import {
  useRowDeleteConfirmation,
  type UseRowDeleteConfirmationOptions,
} from '../../inertia/composables/use_row_delete_confirmation'

interface Row {
  id: number
  name: string
}

const ROW: Row = { id: 12, name: 'Haute saison' }
const OTHER: Row = { id: 13, name: 'Basse saison' }

function setup(options: Partial<UseRowDeleteConfirmationOptions<Row>> = {}) {
  let api!: ReturnType<typeof useRowDeleteConfirmation<Row>>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useRowDeleteConfirmation<Row>({
          url: (row) => `/pricing/seasons/${row.id}`,
          visit: { preserveScroll: true },
          ...options,
        })
        return () => null
      },
    })
  )
  return { api, wrapper }
}

beforeEach(() => {
  resetInertiaMock()
})

describe('useRowDeleteConfirmation', () => {
  test('aucune cible au départ : rien n’est ouvert', () => {
    const { api } = setup()

    expect(api.target.value).toBe(null)
    expect(api.isOpen.value).toBe(false)
  })

  test('`ask` pose la cible et ouvre, sans rien envoyer', () => {
    const { api } = setup()

    api.ask(ROW)

    expect(api.target.value).toEqual(ROW)
    expect(api.isOpen.value).toBe(true)
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('`ask` sur une autre ligne remplace la cible', () => {
    const { api } = setup()

    api.ask(ROW)
    api.ask(OTHER)

    expect(api.target.value).toEqual(OTHER)
  })

  test('`release` referme sans rien envoyer', () => {
    const { api } = setup()
    api.ask(ROW)

    api.release()

    expect(api.target.value).toBe(null)
    expect(api.isOpen.value).toBe(false)
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('`confirm` supprime la cible posée, puis relâche', () => {
    const { api } = setup()
    api.ask(ROW)

    api.confirm()

    expect(routerSpies.delete).toHaveBeenCalledWith('/pricing/seasons/12', {
      preserveScroll: true,
    })
    expect(api.target.value).toBe(null)
    expect(api.isOpen.value).toBe(false)
  })

  test('`confirm` sans cible n’envoie rien', () => {
    const { api } = setup()

    api.confirm()

    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('sans options de visite, la suppression part avec un seul argument', () => {
    const { api } = setup({ visit: undefined })
    api.ask(ROW)

    api.confirm()

    expect(routerSpies.delete.mock.calls[0]).toEqual(['/pricing/seasons/12'])
  })

  test('l’URL est calculée au moment de confirmer, depuis la cible posée', () => {
    const { api } = setup({ url: (row) => `/rows/${row.id}/${row.name}` })
    api.ask(OTHER)

    api.confirm()

    expect(routerSpies.delete).toHaveBeenCalledWith(
      '/rows/13/Basse saison',
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('`isOpen` est réactif pour le `:open` de la modale', async () => {
    const { api } = setup()
    const seen: boolean[] = []
    const stop = vi.fn()
    const unwatch = () => stop()

    api.ask(ROW)
    await nextTick()
    seen.push(api.isOpen.value)

    api.release()
    await nextTick()
    seen.push(api.isOpen.value)

    unwatch()
    expect(seen).toEqual([true, false])
  })
})
