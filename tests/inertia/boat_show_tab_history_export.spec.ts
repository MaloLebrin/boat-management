import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { patch: vi.fn(), post: vi.fn() },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" /></form>' },
  Link: { template: '<a><slot /></a>' },
}))

import BoatShowTabHistory from '../../inertia/components/boats/show/tabs/BoatShowTabHistory.vue'

const boat = { id: 13, name: 'Aventura', engines: [], sails: [] } as never

const globalStubs = { global: { stubs: { teleport: true, transition: true } } }

describe('BoatShowTabHistory — export PDF (#362)', () => {
  test('links to the boat maintenance log PDF when export is allowed', () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: {
        boat,
        maintenanceEvents: [],
        canManageMaintenance: true,
        canExport: true,
        createIntent: null,
      },
      ...globalStubs,
    })

    const link = wrapper
      .findAll('a')
      .find((a) => a.attributes('href')?.includes('maintenance-log.pdf'))
    expect(link).toBeDefined()
    expect(link!.attributes('href')).toBe('/boats/13/maintenance-log.pdf')
    expect(link!.attributes('target')).toBe('_blank')
  })

  test('hides the export link when the plan does not allow exports', () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: {
        boat,
        maintenanceEvents: [],
        canManageMaintenance: true,
        canExport: false,
        createIntent: null,
      },
      ...globalStubs,
    })

    const link = wrapper
      .findAll('a')
      .find((a) => a.attributes('href')?.includes('maintenance-log.pdf'))
    expect(link).toBeUndefined()
  })
})
