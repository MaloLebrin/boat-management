import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

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
  catalogFormSurfaceParam,
  useCatalogFormDraft,
  type CatalogDraftFamily,
} from '../../inertia/composables/use_catalog_form_draft'

const ENGINES: CatalogDraftFamily = {
  rememberPrefix: 'boat-engine-form',
  brandParam: 'engineBrandId',
  surfaceParam: 'engineForm',
}

const SAILS: CatalogDraftFamily = {
  rememberPrefix: 'boat-sail-form',
  brandParam: 'sailBrandId',
  surfaceParam: 'sailForm',
}

function setUrl(search: string) {
  window.history.replaceState({}, '', `/boats/1${search}`)
}

function mountForm(family: CatalogDraftFamily, key: string) {
  const brand = ref('')
  const name = ref('')
  const sync = vi.fn(() => {
    brand.value = 'SERVEUR'
    name.value = 'NOM-SERVEUR'
  })
  const wrapper = mount(
    defineComponent({
      setup() {
        useCatalogFormDraft(family, key, { brand, name }, sync)
        return () => h('div')
      },
    })
  )
  return { wrapper, brand, name, sync }
}

async function typeThenUnmount(form: ReturnType<typeof mountForm>, value: string) {
  form.brand.value = value
  await nextTick()
  form.wrapper.unmount()
}

beforeEach(() => {
  store.clear()
  setUrl('')
})

describe('useCatalogFormDraft', () => {
  test('hors aller-retour catalogue, la synchronisation serveur est appelée', () => {
    const form = mountForm(ENGINES, '2')

    expect(form.sync).toHaveBeenCalledOnce()
    expect(form.brand.value).toBe('SERVEUR')
  })

  test('au retour de l’aller-retour, le brouillon gagne et le serveur n’est pas relu', async () => {
    await typeThenUnmount(mountForm(ENGINES, '2'), 'Volvo Penta')

    setUrl('?engineBrandId=24')
    const second = mountForm(ENGINES, '2')

    expect(second.brand.value).toBe('Volvo Penta')
    expect(second.name.value).toBe('NOM-SERVEUR')
    expect(second.sync).not.toHaveBeenCalled()
  })

  test('un champ absent du brouillon garde sa valeur courante', async () => {
    const first = mountForm(ENGINES, '2')
    first.brand.value = 'Volvo Penta'
    await nextTick()
    first.wrapper.unmount()
    // Le brouillon rangé ne connaît que `brand` et `name` ; un formulaire qui
    // remonte avec un champ de plus ne doit pas l'écraser avec `undefined`.
    store.set('boat-engine-form:2', { touched: true, values: { brand: 'Volvo Penta' } })

    setUrl('?engineBrandId=24')

    expect(mountForm(ENGINES, '2').name.value).toBe('')
  })

  test('sans saisie, un aller-retour repart quand même du serveur', () => {
    setUrl('?engineBrandId=24')

    expect(mountForm(ENGINES, '2').sync).toHaveBeenCalledOnce()
  })

  test('la clé isole les brouillons d’une même famille', async () => {
    await typeThenUnmount(mountForm(ENGINES, '2'), 'Volvo Penta')

    setUrl('?engineBrandId=24')

    expect(mountForm(ENGINES, '7').brand.value).toBe('SERVEUR')
  })

  test('le préfixe et le paramètre isolent deux familles', async () => {
    await typeThenUnmount(mountForm(ENGINES, '2'), 'Volvo Penta')

    // Même clé, autre famille : ni le brouillon ni le paramètre ne traversent.
    setUrl('?engineBrandId=24')
    expect(mountForm(SAILS, '2').brand.value).toBe('SERVEUR')

    setUrl('?sailBrandId=3')
    expect(mountForm(ENGINES, '2').brand.value).toBe('SERVEUR')
  })

  test('chaque frappe met le brouillon à jour', async () => {
    const form = mountForm(ENGINES, '2')

    form.brand.value = 'Yamaha'
    await nextTick()
    expect(store.get('boat-engine-form:2')).toEqual({
      touched: true,
      values: { brand: 'Yamaha', name: 'NOM-SERVEUR' },
    })

    form.name.value = 'Bâbord'
    await nextTick()
    expect(store.get('boat-engine-form:2')).toEqual({
      touched: true,
      values: { brand: 'Yamaha', name: 'Bâbord' },
    })
  })
})

describe('catalogFormSurfaceParam', () => {
  test('rend la surface posée par le formulaire, `null` sans paramètre', () => {
    setUrl('?engineForm=equipment-add')
    expect(catalogFormSurfaceParam(ENGINES)).toBe('equipment-add')

    setUrl('?sailForm=sail-card')
    expect(catalogFormSurfaceParam(ENGINES)).toBe(null)

    setUrl('')
    expect(catalogFormSurfaceParam(ENGINES)).toBe(null)
  })
})
