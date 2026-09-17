import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Caractérisation des deux brouillons de formulaire catalogue — moteur (#573)
 * et équipement générique (#577, « décalque » du premier) — avant l'extraction
 * du composable partagé `useCatalogFormDraft` (vague 3.5).
 *
 * `tests/inertia/use_engine_form_draft.spec.ts` fige déjà le contrat moteur.
 * Ce qui n'était couvert nulle part, et que le partage pourrait casser : le
 * jumeau équipement, ses helpers de surface, et surtout l'étanchéité entre les
 * deux familles (paramètre d'URL et espace de noms du brouillon).
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
import {
  genericEquipmentFormSurfaceParam,
  shouldReopenGenericEquipmentForm,
  useGenericEquipmentFormDraft,
} from '../../inertia/composables/use_generic_equipment_form_draft'

function setUrl(search: string) {
  window.history.replaceState({}, '', `/boats/1${search}`)
}

type DraftHook = (key: string, fields: Record<string, Ref<string>>, sync: () => void) => void

/** Monte un formulaire minimal qui repart toujours des mêmes valeurs serveur. */
function mountForm(useDraft: DraftHook, key: string) {
  const brand = ref('')
  const name = ref('')
  const wrapper = mount(
    defineComponent({
      setup() {
        useDraft(key, { brand, name }, () => {
          brand.value = 'SERVEUR'
          name.value = 'NOM-SERVEUR'
        })
        return () => h('div')
      },
    })
  )
  return { wrapper, brand, name }
}

/** Saisit une valeur, la laisse arriver dans le brouillon, puis démonte. */
async function typeThenUnmount(form: ReturnType<typeof mountForm>, value: string) {
  form.brand.value = value
  await nextTick()
  form.wrapper.unmount()
}

beforeEach(() => {
  store.clear()
  setUrl('')
})

describe('brouillon du formulaire d’équipement générique', () => {
  test('sans aller-retour catalogue, repart des valeurs serveur', () => {
    expect(mountForm(useGenericEquipmentFormDraft, 'new').brand.value).toBe('SERVEUR')
  })

  test('restaure la saisie en cours au retour de l’aller-retour catalogue', async () => {
    await typeThenUnmount(mountForm(useGenericEquipmentFormDraft, '5'), 'Plastimo')

    setUrl('?equipmentBrandId=12')

    expect(mountForm(useGenericEquipmentFormDraft, '5').brand.value).toBe('Plastimo')
  })

  test('ne ressuscite jamais un brouillon abandonné hors aller-retour', async () => {
    await typeThenUnmount(mountForm(useGenericEquipmentFormDraft, '5'), 'Plastimo')

    setUrl('')

    expect(mountForm(useGenericEquipmentFormDraft, '5').brand.value).toBe('SERVEUR')
  })

  test('un brouillon d’un autre équipement ne fuit pas sur celui-ci', async () => {
    await typeThenUnmount(mountForm(useGenericEquipmentFormDraft, '5'), 'Plastimo')

    setUrl('?equipmentBrandId=12')

    expect(mountForm(useGenericEquipmentFormDraft, '9').brand.value).toBe('SERVEUR')
  })

  test('les helpers de surface ne reconnaissent que la leur', () => {
    setUrl('?equipmentBrandId=12&equipmentForm=equipment-add')

    expect(shouldReopenGenericEquipmentForm('equipment-add')).toBe(true)
    expect(shouldReopenGenericEquipmentForm('generic-card')).toBe(false)
    expect(genericEquipmentFormSurfaceParam()).toBe('equipment-add')

    setUrl('?equipmentBrandId=12')
    expect(shouldReopenGenericEquipmentForm('equipment-add')).toBe(false)
    expect(genericEquipmentFormSurfaceParam()).toBe(null)
  })

  test('la surface brute traverse un identifiant (`…-edit-<id>`)', () => {
    setUrl('?equipmentForm=generic-edit-42')

    expect(genericEquipmentFormSurfaceParam()).toBe('generic-edit-42')
    expect(shouldReopenGenericEquipmentForm('generic-edit-42')).toBe(true)
  })
})

describe('étanchéité entre les deux familles', () => {
  test('l’aller-retour moteur ne restaure pas un brouillon d’équipement', async () => {
    await typeThenUnmount(mountForm(useGenericEquipmentFormDraft, '5'), 'Plastimo')

    setUrl('?engineBrandId=24')

    expect(mountForm(useGenericEquipmentFormDraft, '5').brand.value).toBe('SERVEUR')
  })

  test('l’aller-retour équipement ne restaure pas un brouillon moteur', async () => {
    await typeThenUnmount(mountForm(useEngineFormDraft, '2'), 'Volvo Penta')

    setUrl('?equipmentBrandId=12')

    expect(mountForm(useEngineFormDraft, '2').brand.value).toBe('SERVEUR')
  })

  test('une même clé range deux brouillons distincts selon la famille', async () => {
    await typeThenUnmount(mountForm(useEngineFormDraft, '2'), 'Volvo Penta')
    setUrl('?equipmentBrandId=12')
    await typeThenUnmount(mountForm(useGenericEquipmentFormDraft, '2'), 'Plastimo')

    setUrl('?engineBrandId=24')
    expect(mountForm(useEngineFormDraft, '2').brand.value).toBe('Volvo Penta')

    setUrl('?equipmentBrandId=12')
    expect(mountForm(useGenericEquipmentFormDraft, '2').brand.value).toBe('Plastimo')
  })

  test('les surfaces ne se confondent pas entre familles', () => {
    setUrl('?engineForm=equipment-add')

    expect(shouldReopenEngineForm('equipment-add')).toBe(true)
    expect(shouldReopenGenericEquipmentForm('equipment-add')).toBe(false)
  })
})
