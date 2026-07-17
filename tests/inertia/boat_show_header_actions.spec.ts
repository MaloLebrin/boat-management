import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>', props: ['route', 'params'] },
}))

import BoatShowHeaderActions from '../../inertia/components/boats/show/BoatShowHeaderActions.vue'

const baseProps = {
  boatId: 13,
  canManageMaintenance: true,
  canManageEquipment: true,
  canCreateNavigationLogs: true,
  canExport: true,
}

function openAddMenu(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button')[0]!.trigger('click')
}

describe('BoatShowHeaderActions — regroupement des actions d’en-tête (#365)', () => {
  test('the primary "+ Ajouter" menu is hidden when the user can do nothing', () => {
    const wrapper = mount(BoatShowHeaderActions, {
      props: {
        ...baseProps,
        canManageMaintenance: false,
        canManageEquipment: false,
        canCreateNavigationLogs: false,
      },
    })

    expect(wrapper.text()).not.toContain('boats.show.addMenu.label')
  })

  test('emits addEvent and addTask only when canManageMaintenance is true', async () => {
    const wrapper = mount(BoatShowHeaderActions, { props: baseProps })
    await openAddMenu(wrapper)

    const items = wrapper.findAll('button[role="menuitem"]')
    expect(items).toHaveLength(4)

    await items[0]!.trigger('click')
    expect(wrapper.emitted('addEvent')).toHaveLength(1)

    await openAddMenu(wrapper)
    await wrapper.findAll('button[role="menuitem"]')[1]!.trigger('click')
    expect(wrapper.emitted('addTask')).toHaveLength(1)
  })

  test('hides entry/task items when canManageMaintenance is false', async () => {
    const wrapper = mount(BoatShowHeaderActions, {
      props: { ...baseProps, canManageMaintenance: false },
    })
    await openAddMenu(wrapper)

    const labels = wrapper.findAll('button[role="menuitem"]').map((el) => el.text())
    expect(labels).not.toContain('boats.show.addMenu.event')
    expect(labels).not.toContain('boats.show.addMenu.task')
  })

  test('emits addEquipment and addNavigationLog', async () => {
    const wrapper = mount(BoatShowHeaderActions, { props: baseProps })
    await openAddMenu(wrapper)

    const items = wrapper.findAll('button[role="menuitem"]')
    await items[2]!.trigger('click')
    expect(wrapper.emitted('addEquipment')).toHaveLength(1)

    await openAddMenu(wrapper)
    await wrapper.findAll('button[role="menuitem"]')[3]!.trigger('click')
    expect(wrapper.emitted('addNavigationLog')).toHaveLength(1)
  })

  test('the "⋯" menu links to budget/edit and hides the PDF export when canExport is false', async () => {
    const wrapper = mount(BoatShowHeaderActions, { props: { ...baseProps, canExport: false } })

    // Second dropdown trigger is the "⋯" more-actions menu.
    await wrapper.findAll('button')[1]!.trigger('click')

    const links = wrapper.findAll('a[role="menuitem"]')
    expect(links).toHaveLength(2)
  })

  test('the "⋯" menu shows the PDF export link when canExport is true', async () => {
    const wrapper = mount(BoatShowHeaderActions, { props: baseProps })
    await wrapper.findAll('button')[1]!.trigger('click')

    const links = wrapper.findAll('a[role="menuitem"]')
    expect(links).toHaveLength(3)
    expect(links[2]!.attributes('href')).toBe('/boats/13/maintenance-log.pdf')
  })
})
