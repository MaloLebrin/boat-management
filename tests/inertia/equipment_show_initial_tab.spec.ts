import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import BaseTabs from '../../inertia/components/base/BaseTabs.vue'
import SailShow from '../../inertia/pages/boats/sail_show.vue'
import GenericEquipmentShow from '../../inertia/pages/boats/generic_equipment_show.vue'

/**
 * Les pages d'équipement lisaient `?tab=` dans `onMounted` : le rendu SSR
 * partait de l'onglet « info » puis basculait à l'hydratation. Elles reçoivent
 * désormais `initialTab` du serveur, comme la fiche bateau (#463).
 */
const taskPermissions = { canCreate: true, canUpdate: true, canDelete: true } as never
const taskEquipment = { engines: [], sails: [], rigs: [], safety: [], generic: [] } as never

const sailProps = {
  boat: { id: 1, name: 'Aventura' },
  sail: { id: 2, sailType: 'mainsail', status: 'operational', photos: [] },
  canManage: true,
  maintenanceTasks: [],
  taskEquipment,
  taskPermissions,
} as never

const genericProps = {
  boat: { id: 1, name: 'Aventura' },
  item: { id: 3, name: 'Guindeau', status: 'ok', photos: [] },
  canManage: true,
  maintenanceTasks: [],
  taskEquipment,
  taskPermissions,
} as never

describe('equipment pages — initial tab comes from the server', () => {
  const originalUrl = window.location.href

  beforeEach(() => window.history.replaceState({}, '', '/boats/1/sails/2'))
  afterEach(() => window.history.replaceState({}, '', originalUrl))

  test('sail page opens on the tab the server saw, without reading window.location', () => {
    const wrapper = mount(SailShow, {
      props: { ...sailProps, initialTab: 'photos' },
      shallow: true,
    })
    expect(wrapper.findComponent(BaseTabs).props('modelValue')).toBe('photos')
  })

  test('sail page ignores a window param the server did not see', () => {
    window.history.replaceState({}, '', '/boats/1/sails/2?tab=photos')
    const wrapper = mount(SailShow, { props: { ...sailProps, initialTab: null }, shallow: true })
    expect(wrapper.findComponent(BaseTabs).props('modelValue')).toBe('info')
  })

  test('generic equipment page opens on the tab the server saw', () => {
    const wrapper = mount(GenericEquipmentShow, {
      props: { ...genericProps, initialTab: 'tasks' },
      shallow: true,
    })
    expect(wrapper.findComponent(BaseTabs).props('modelValue')).toBe('tasks')
  })
})
