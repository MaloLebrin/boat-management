import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import SettingsMembersInviteForm from '../../inertia/components/settings/tabs/SettingsMembersInviteForm.vue'

// Plain object (not Vue-reactive) is enough here: each test sets `role` before
// mounting, so no cross-render reactivity is needed — assertions on `boatIds`
// read the mock object directly rather than the rendered DOM.
const mockForm = vi.hoisted(() => ({
  email: '',
  role: 'member',
  boatIds: [] as number[],
  errors: {} as Record<string, string>,
  processing: false,
  post: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => mockForm,
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

const boatOptions = [
  { id: 1, name: 'Bora Bora' },
  { id: 2, name: 'Santorini' },
]

describe('SettingsMembersInviteForm', () => {
  test('does not render the boat checklist when role is not boat_owner', () => {
    mockForm.role = 'member'
    const wrapper = mount(SettingsMembersInviteForm, { props: { boatOptions } })

    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
  })

  test('renders one checkbox per boat option when role is boat_owner', async () => {
    mockForm.role = 'boat_owner'
    const wrapper = mount(SettingsMembersInviteForm, { props: { boatOptions } })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(boatOptions.length)
  })

  test('toggling a boat checkbox updates form.boatIds', async () => {
    mockForm.role = 'boat_owner'
    mockForm.boatIds = []
    const wrapper = mount(SettingsMembersInviteForm, { props: { boatOptions } })
    await wrapper.vm.$nextTick()

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0]!.setValue(true)

    expect(mockForm.boatIds).toEqual([1])

    await checkboxes[0]!.setValue(false)
    expect(mockForm.boatIds).toEqual([])
  })

  describe('single boat fleet (#823)', () => {
    const singleBoat = [{ id: 1, name: 'Bora Bora' }]

    test('boat_owner gets the only boat without any checkbox', () => {
      mockForm.role = 'boat_owner'
      mockForm.boatIds = []
      const wrapper = mount(SettingsMembersInviteForm, { props: { boatOptions: singleBoat } })

      expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
      expect(mockForm.boatIds).toEqual([1])
      expect(wrapper.find('[data-testid="invite-single-boat"]').text()).toBe(
        'settings.members.inviteForm.singleBoat'
      )
    })

    test('other roles leave boatIds untouched', () => {
      mockForm.role = 'member'
      mockForm.boatIds = []
      const wrapper = mount(SettingsMembersInviteForm, { props: { boatOptions: singleBoat } })

      expect(mockForm.boatIds).toEqual([])
      expect(wrapper.find('[data-testid="invite-single-boat"]').exists()).toBe(false)
    })
  })
})
