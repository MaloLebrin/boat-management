import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import SettingsMembersTab from '../../inertia/components/settings/tabs/SettingsMembersTab.vue'

const routerPut = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { put: routerPut, delete: vi.fn() },
  useForm: () => ({ processing: false, post: vi.fn(), reset: vi.fn() }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

const members = [
  { id: 10, userId: 2, fullName: 'Alice Skipper', email: 'alice@example.com', role: 'member' },
]

function mountTab() {
  return mount(SettingsMembersTab, {
    props: {
      currentUserId: 1,
      members,
      pendingInvitations: [],
      canManageMembers: true,
      canAddMember: true,
      boatOptions: [],
    },
  })
}

// The confirmation modal is teleported to document.body, so modal content is
// queried there rather than through the component wrapper.
function bodyButtonByText(text: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === text
  ) as HTMLButtonElement | undefined
}

describe('SettingsMembersTab — role change confirmation', () => {
  beforeEach(() => routerPut.mockClear())
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('changing the role select does not PUT immediately, it opens a confirmation modal', async () => {
    const wrapper = mountTab()

    await wrapper.find('select').setValue('admin')

    expect(routerPut).not.toHaveBeenCalled()
    expect(bodyButtonByText('settings.members.roleConfirm.confirm')).toBeTruthy()
  })

  test('confirming the modal PUTs the new role', async () => {
    const wrapper = mountTab()

    await wrapper.find('select').setValue('admin')
    bodyButtonByText('settings.members.roleConfirm.confirm')!.click()
    await wrapper.vm.$nextTick()

    expect(routerPut).toHaveBeenCalledTimes(1)
    expect(routerPut).toHaveBeenCalledWith(
      '/organization/members/10',
      { role: 'admin' },
      { preserveScroll: true }
    )
  })

  test('cancelling the modal does not PUT', async () => {
    const wrapper = mountTab()

    await wrapper.find('select').setValue('admin')
    bodyButtonByText('common.cancel')!.click()
    await wrapper.vm.$nextTick()

    expect(routerPut).not.toHaveBeenCalled()
  })

  test('selecting boat_owner surfaces an "assign boats" link', async () => {
    const wrapper = mountTab()

    await wrapper.find('select').setValue('boat_owner')

    expect(document.body.querySelector('a[href="/boats"]')).not.toBeNull()
  })

  test('re-selecting the current role does nothing', async () => {
    const wrapper = mountTab()

    await wrapper.find('select').setValue('member')

    expect(routerPut).not.toHaveBeenCalled()
    expect(bodyButtonByText('settings.members.roleConfirm.confirm')).toBeFalsy()
  })
})
