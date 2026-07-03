import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import NavigationLogCrewPanel from '../../inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue'

const mockPatch = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({
    crewMemberId: '',
    role: 'crew',
    errors: {},
    processing: false,
    patch: mockPatch,
    reset: vi.fn(),
  }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

function mountPanel() {
  return mount(NavigationLogCrewPanel, {
    props: {
      boatId: 1,
      logId: 1,
      crew: [{ crewMemberId: 1, role: 'skipper', fullName: 'Alice' }],
      crewMemberOptions: [],
      canUpdate: true,
    },
  })
}

describe('NavigationLogCrewPanel — removing the last crew member', () => {
  beforeEach(() => {
    mockPatch.mockClear()
  })

  test('asks for confirmation and does not submit when cancelled', async () => {
    const confirmMock = vi.fn().mockReturnValue(false)
    vi.stubGlobal('confirm', confirmMock)
    const wrapper = mountPanel()

    await wrapper.find('button').trigger('click')

    expect(confirmMock).toHaveBeenCalledOnce()
    expect(mockPatch).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  test('submits the empty crew list when confirmed', async () => {
    const confirmMock = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirmMock)
    const wrapper = mountPanel()

    await wrapper.find('button').trigger('click')

    expect(confirmMock).toHaveBeenCalledOnce()
    expect(mockPatch).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })
})
