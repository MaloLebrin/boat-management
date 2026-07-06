import { mount } from '@vue/test-utils'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const mockRouterDelete = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn(() => true))

vi.mock('@inertiajs/vue3', () => ({
  router: { delete: mockRouterDelete },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_reservation_format', () => ({
  useReservationFormat: () => ({ formatDate: (s: string) => s.slice(0, 10) }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
    emits: ['click'],
  },
}))

vi.mock('~/components/reservations/ReservationStatusBadge.vue', () => ({
  default: {
    template: '<span :data-status="status" />',
    props: ['status'],
  },
}))

vi.mock('~/components/reservations/ReservationEditModal.vue', () => ({
  default: {
    template: '<div />',
    props: ['open', 'boatId', 'reservation'],
    emits: ['update:open'],
  },
}))

import ReservationList from '../../inertia/components/reservations/ReservationList.vue'
import type { BoatReservationRow } from '../../shared/types/reservation'

const row: BoatReservationRow = {
  id: 1,
  boatId: 5,
  boatName: 'Mistral',
  organizationId: 10,
  status: 'confirmed',
  startsAt: '2026-06-01T10:00:00.000Z',
  endsAt: '2026-06-07T10:00:00.000Z',
  clientName: 'Alice Martin',
  clientEmail: 'alice@example.com',
  clientPhone: null,
  notes: null,
  totalPrice: '1500',
  createdAt: '2026-05-01T00:00:00.000Z',
}

describe('ReservationList', () => {
  beforeAll(() => {
    vi.stubGlobal('confirm', mockConfirm)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockReturnValue(true)
  })

  test('hides table when reservations list is empty', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [], canManage: false },
    })
    expect(wrapper.find('table').exists()).toBe(false)
  })

  test('renders one row per reservation', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: false },
    })
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  test('shows client name and formatted dates', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: false },
    })
    expect(wrapper.text()).toContain('Alice Martin')
    expect(wrapper.text()).toContain('2026-06-01')
  })

  test('shows price with euro sign', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: false },
    })
    expect(wrapper.text()).toContain('1500 €')
  })

  test('shows dash when price is null', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [{ ...row, totalPrice: null }], canManage: false },
    })
    expect(wrapper.text()).toContain('—')
  })

  test('shows status badge with correct status', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: false },
    })
    expect(wrapper.find('[data-status="confirmed"]').exists()).toBe(true)
  })

  test('hides action buttons when canManage is false', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: false },
    })
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  test('shows action buttons (inspection, contract, edit, delete) when canManage is true', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: true },
    })
    expect(wrapper.findAll('button')).toHaveLength(4)
  })

  test('delete calls router.delete with correct URL after confirm', async () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: true },
    })
    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')
    expect(mockRouterDelete).toHaveBeenCalledWith('/boats/5/reservations/1', {
      preserveScroll: true,
    })
  })

  test('delete is aborted when confirm returns false', async () => {
    mockConfirm.mockReturnValue(false)
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: true },
    })
    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')
    expect(mockRouterDelete).not.toHaveBeenCalled()
  })
})
