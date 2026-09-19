import { mount } from '@vue/test-utils'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const mockRouterDelete = vi.hoisted(() => vi.fn())
const mockRouterPost = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn(() => true))

// Les noms accessibles interpolent le client (#735) : sans les chaînes réelles,
// `t()` renverrait la clé et le test ne prouverait rien.
const appT = vi.hoisted(() => ({
  'reservations.columns.documents': 'Documents',
  'reservations.actions.createQuote': 'Create a quote',
  'reservations.actions.createQuoteFor': 'Create a quote for {client}',
  'reservations.actions.inspectionFor': 'Inspection for {client}',
  'reservations.actions.contractFor': 'Rental contract for {client}',
  'reservations.actions.editFor': 'Edit the reservation for {client}',
  'reservations.actions.deleteFor': 'Delete the reservation for {client}',
}))

vi.mock('@inertiajs/vue3', () => ({
  router: { delete: mockRouterDelete, post: mockRouterPost },
  usePage: () => ({ props: { appT, locale: 'en' } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (s: string) => s.slice(0, 10) }),
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
  linkedInvoices: [],
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

  test('each row action carries an accessible name naming the client (#735)', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: true },
    })
    const labels = wrapper.findAll('button').map((b) => b.attributes('aria-label'))
    expect(labels).toEqual([
      'Inspection for Alice Martin',
      'Rental contract for Alice Martin',
      'Edit the reservation for Alice Martin',
      'Delete the reservation for Alice Martin',
    ])
  })

  test('the action group is revealed on keyboard focus, not only on hover (#735)', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: true },
    })
    const group = wrapper.find('tbody .opacity-0')
    expect(group.classes()).toContain('group-focus-within:opacity-100')
  })

  test('hides the documents column when there is nothing to show', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: true },
    })
    expect(wrapper.text()).not.toContain('Create a quote')
    expect(wrapper.findAll('thead th')).toHaveLength(6)
  })

  test('offers a create-quote action when the org may invoice (#735)', () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: true, canCreateQuote: true },
    })
    expect(wrapper.text()).toContain('Create a quote')
  })

  test('create quote posts to the from-reservation route', async () => {
    const wrapper = mount(ReservationList, {
      props: { boatId: 5, reservations: [row], canManage: true, canCreateQuote: true },
    })
    const quoteButton = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === 'Create a quote for Alice Martin')
    await quoteButton!.trigger('click')
    expect(mockRouterPost).toHaveBeenCalledWith(
      '/invoices/from-reservation/1',
      {},
      { preserveScroll: true }
    )
  })

  test('links the documents already generated from the reservation (#735)', () => {
    const wrapper = mount(ReservationList, {
      props: {
        boatId: 5,
        reservations: [{ ...row, linkedInvoices: [{ id: 42, number: 'DEV-000001' }] }],
        canManage: false,
      },
    })
    const link = wrapper.find('tbody a')
    expect(link.attributes('href')).toBe('/invoices/42')
    expect(link.text()).toBe('DEV-000001')
  })
})
