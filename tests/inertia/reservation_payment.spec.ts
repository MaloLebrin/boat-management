import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockPatch = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn(() => true))

const appT = vi.hoisted(() => ({
  'reservations.payment.attention.deposit_due': 'Deposit expected',
  'reservations.payment.attention.balance_due': 'Balance to collect',
  'reservations.payment.status.deposit_paid': 'Deposit received',
  'reservations.payment.status.paid': 'Paid',
  'reservations.payment.status.refunded': 'Refunded',
  'reservations.payment.actions.deposit': 'Deposit received',
  'reservations.payment.actions.balance': 'Balance received',
  'reservations.payment.actions.refund': 'Refund',
  'reservations.payment.actions.confirmRefund': 'Record a refund of {amount}?',
  'reservations.payment.securityDeposit.hold': 'Security deposit held',
  'reservations.payment.securityDeposit.release': 'Release the deposit',
  'reservations.payment.securityDeposit.retain': 'Retain',
  'reservations.payment.securityDeposit.status.held': 'Held',
}))

vi.mock('@inertiajs/vue3', () => ({
  router: { patch: mockPatch },
  usePage: () => ({ props: { appT, locale: 'en' } }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (s: string) => s.slice(0, 10) }),
}))

vi.mock('~/utils/native_dialog', () => ({ confirmed: mockConfirm }))

import ReservationPaymentBadge from '../../inertia/components/reservations/payment/ReservationPaymentBadge.vue'
import ReservationPaymentPanel from '../../inertia/components/reservations/payment/ReservationPaymentPanel.vue'
import SecurityDepositPanel from '../../inertia/components/reservations/payment/SecurityDepositPanel.vue'
import type { BoatReservationRow } from '../../shared/types/reservation'
import { UNPAID_RESERVATION_FIELDS } from './helpers/reservation_payment'

const inAMonth = new Date(Date.now() + 30 * 86_400_000).toISOString()
const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString()

const row: BoatReservationRow = {
  id: 7,
  boatId: 5,
  boatName: 'Sea Breeze',
  organizationId: 1,
  clientId: null,
  status: 'confirmed',
  type: null,
  startsAt: inAMonth,
  endsAt: inAMonth,
  clientName: 'Alice Martin',
  clientEmail: null,
  clientPhone: null,
  notes: null,
  totalPrice: '1000.00',
  ...UNPAID_RESERVATION_FIELDS,
  depositAmount: '300.00',
  createdAt: '2026-05-01T00:00:00.000Z',
  linkedInvoices: [],
}

const RELOAD = ['reservations', 'errors', 'flash']

function buttonByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((b) => b.text() === text)
}

beforeEach(() => {
  mockPatch.mockClear()
  mockConfirm.mockClear()
  mockConfirm.mockReturnValue(true)
})

describe('ReservationPaymentBadge (#875)', () => {
  test('a confirmed reservation without deposit asks for it', () => {
    const wrapper = mount(ReservationPaymentBadge, { props: { reservation: row } })
    expect(wrapper.text()).toBe('Deposit expected')
  })

  test('a departure within 7 days that is not fully paid asks for the balance', () => {
    const wrapper = mount(ReservationPaymentBadge, {
      props: {
        reservation: {
          ...row,
          startsAt: inThreeDays,
          paymentStatus: 'deposit_paid',
          paidAmount: '300.00',
        },
      },
    })
    expect(wrapper.text()).toBe('Balance to collect')
  })

  test('a paid reservation says so, an unpaid option shows nothing', () => {
    const paid = mount(ReservationPaymentBadge, {
      props: { reservation: { ...row, paymentStatus: 'paid', paidAmount: '1000.00' } },
    })
    expect(paid.text()).toBe('Paid')

    const option = mount(ReservationPaymentBadge, {
      props: { reservation: { ...row, status: 'option' } },
    })
    expect(option.text()).toBe('—')
  })
})

describe('ReservationPaymentPanel (#875)', () => {
  test('records the deposit with the amount and method, reloading only the given props', async () => {
    const wrapper = mount(ReservationPaymentPanel, {
      props: { boatId: 5, reservation: row, canManage: true, reloadProps: RELOAD },
    })
    await buttonByText(wrapper, 'Deposit received')!.trigger('click')
    expect(mockPatch).toHaveBeenCalledWith(
      '/boats/5/reservations/7/payment',
      { kind: 'deposit', method: 'transfer', amount: 300 },
      expect.objectContaining({ preserveScroll: true, only: RELOAD })
    )
  })

  test('after the deposit, only the balance (and a refund) remain', () => {
    const wrapper = mount(ReservationPaymentPanel, {
      props: {
        boatId: 5,
        reservation: { ...row, paymentStatus: 'deposit_paid', paidAmount: '300.00' },
        canManage: true,
        reloadProps: RELOAD,
      },
    })
    expect(buttonByText(wrapper, 'Deposit received')).toBeUndefined()
    expect(buttonByText(wrapper, 'Balance received')).toBeDefined()
    expect(buttonByText(wrapper, 'Refund')).toBeDefined()
  })

  test('a refund asks for confirmation first', async () => {
    mockConfirm.mockReturnValue(false)
    const wrapper = mount(ReservationPaymentPanel, {
      props: {
        boatId: 5,
        reservation: {
          ...row,
          status: 'cancelled',
          paymentStatus: 'deposit_paid',
          paidAmount: '300.00',
        },
        canManage: true,
        reloadProps: RELOAD,
      },
    })
    await buttonByText(wrapper, 'Refund')!.trigger('click')
    expect(mockConfirm).toHaveBeenCalled()
    expect(mockPatch).not.toHaveBeenCalled()
  })

  test('read-only without the right to manage', () => {
    const wrapper = mount(ReservationPaymentPanel, {
      props: { boatId: 5, reservation: row, canManage: false, reloadProps: RELOAD },
    })
    expect(wrapper.findAll('button')).toHaveLength(0)
  })
})

describe('SecurityDepositPanel (#875)', () => {
  test('holds the deposit copied from the boat pricing', async () => {
    const wrapper = mount(SecurityDepositPanel, {
      props: {
        boatId: 5,
        reservation: { ...row, securityDepositAmount: '1500.00' },
        canManage: true,
        reloadProps: RELOAD,
      },
    })
    await buttonByText(wrapper, 'Security deposit held')!.trigger('click')
    expect(mockPatch).toHaveBeenCalledWith(
      '/boats/5/reservations/7/security-deposit',
      { action: 'hold', amount: 1500 },
      expect.objectContaining({ only: RELOAD })
    )
  })

  test('once held, it can be released or retained with an amount and a reason', async () => {
    const wrapper = mount(SecurityDepositPanel, {
      props: {
        boatId: 5,
        reservation: { ...row, securityDepositAmount: '1500.00', securityDepositStatus: 'held' },
        canManage: true,
        reloadProps: RELOAD,
      },
    })
    expect(wrapper.text()).toContain('Held')
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('200')
    await inputs[1].setValue('Propeller damaged')
    await buttonByText(wrapper, 'Retain')!.trigger('click')
    expect(mockPatch).toHaveBeenCalledWith(
      '/boats/5/reservations/7/security-deposit',
      { action: 'retain', amount: 200, note: 'Propeller damaged' },
      expect.any(Object)
    )

    await buttonByText(wrapper, 'Release the deposit')!.trigger('click')
    expect(mockPatch).toHaveBeenLastCalledWith(
      '/boats/5/reservations/7/security-deposit',
      { action: 'release' },
      expect.any(Object)
    )
  })
})
