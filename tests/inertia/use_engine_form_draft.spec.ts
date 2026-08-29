import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { test, expect, vi, beforeEach } from 'vitest'

/**
 * Faux magasin `useRemember` : reproduit ce que fait Inertia, à savoir ranger
 * l'état hors du composant pour qu'il survive à un remontage.
 */
const store = new Map<string, unknown>()

vi.mock('@inertiajs/vue3', () => ({
  useRemember: (data: unknown, key: string) => {
    const state = ref(store.has(key) ? store.get(key) : data)
    return new Proxy(state, {
      get: (target, prop) => (prop === 'value' ? target.value : Reflect.get(target, prop)),
      set: (target, prop, value) => {
        if (prop === 'value') store.set(key, value)
        return Reflect.set(target, prop, value)
      },
    })
  },
}))

import {
  shouldReopenEngineForm,
  useEngineFormDraft,
} from '../../inertia/composables/use_engine_form_draft'

function setUrl(search: string) {
  window.history.replaceState({}, '', `/boats/1/engines/2/edit${search}`)
}

/** Monte un formulaire minimal qui repart toujours des mêmes valeurs serveur. */
function mountForm(key = '2') {
  const brand = ref('')
  const serialNumber = ref('')
  const component = defineComponent({
    setup() {
      useEngineFormDraft(key, { brand, serialNumber }, () => {
        brand.value = 'Yamaha'
        serialNumber.value = 'SN-SERVEUR'
      })
      return () => h('div')
    },
  })
  const wrapper = mount(component)
  return { wrapper, brand, serialNumber }
}

beforeEach(() => {
  store.clear()
  setUrl('')
})

test('sans aller-retour catalogue, repart des valeurs serveur', () => {
  const { brand } = mountForm()
  expect(brand.value).toBe('Yamaha')
})

test('restaure la saisie en cours au retour de l’aller-retour catalogue', async () => {
  const first = mountForm()
  first.brand.value = 'Volvo Penta'
  first.serialNumber.value = 'SN-SAISI'
  await nextTick()
  first.wrapper.unmount()

  // La visite partielle pose le paramètre dans l'URL puis remonte l'arbre.
  setUrl('?engineBrandId=24')
  const second = mountForm()

  expect(second.brand.value).toBe('Volvo Penta')
  expect(second.serialNumber.value).toBe('SN-SAISI')
})

test('ne ressuscite jamais un brouillon abandonné hors aller-retour', async () => {
  const first = mountForm()
  first.brand.value = 'Volvo Penta'
  await nextTick()
  first.wrapper.unmount()

  // Réouverture normale de l'écran : pas de paramètre catalogue dans l'URL.
  setUrl('')
  const second = mountForm()

  expect(second.brand.value).toBe('Yamaha')
})

test('un brouillon d’un autre moteur ne fuit pas sur celui-ci', async () => {
  const first = mountForm('2')
  first.brand.value = 'Volvo Penta'
  await nextTick()
  first.wrapper.unmount()

  setUrl('?engineBrandId=24')
  const other = mountForm('7')

  expect(other.brand.value).toBe('Yamaha')
})

test('shouldReopenEngineForm ne reconnaît que sa propre surface', () => {
  setUrl('?engineBrandId=24&engineForm=equipment-add')

  expect(shouldReopenEngineForm('equipment-add')).toBe(true)
  expect(shouldReopenEngineForm('engines-card')).toBe(false)

  setUrl('?engineBrandId=24')
  expect(shouldReopenEngineForm('equipment-add')).toBe(false)
})
