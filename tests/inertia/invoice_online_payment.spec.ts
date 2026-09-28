import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { InvoiceDetail } from '../../shared/types/invoice'
import type { PublicInvoicePayment } from '../../shared/types/online_payment'

const mockPost = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())
const mockFormPost = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { post: mockPost, delete: mockDelete },
  useForm: () => ({ processing: false, post: mockFormPost }),
  usePage: () => ({ props: { appT: {}, locale: 'en', flash: {} } }),
  Head: { template: '<div />' },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'disabled'],
    emits: ['click'],
  },
}))
vi.mock('~/components/base/BaseCard.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('~/components/base/BaseHeading.vue', () => ({
  default: { template: '<h1><slot /></h1>', props: ['level'] },
}))
vi.mock('~/components/base/BaseAlert.vue', () => ({
  default: { template: '<div :data-variant="variant"><slot /></div>', props: ['variant'] },
}))
vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span :data-variant="variant"><slot /></span>', props: ['variant'] },
}))

import InvoiceOnlinePaymentCard from '../../inertia/components/invoices/InvoiceOnlinePaymentCard.vue'
import SettingsOnlinePayments from '../../inertia/components/settings/SettingsOnlinePayments.vue'
import PayShow from '../../inertia/pages/pay/show.vue'

function makeInvoice(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    id: 42,
    kind: 'invoice',
    number: 'FAC-000001',
    status: 'sent',
    clientId: null,
    clientName: 'Alice Martin',
    reservationId: null,
    issuedAt: '2026-07-05',
    dueAt: null,
    paidAt: null,
    paymentMethod: null,
    sourceQuoteId: null,
    creditedInvoiceId: null,
    subtotal: 100,
    taxRate: 20,
    taxAmount: 20,
    total: 120,
    currency: 'EUR',
    createdAt: null,
    notes: null,
    lines: [],
    sourceQuote: null,
    convertedInvoice: null,
    reservationBoatId: null,
    onlinePaymentUrl: null,
    creditedInvoice: null,
    creditNotes: [],
    creditedTotal: 0,
    balanceDue: 0,
    ...overrides,
  }
}

function makePayment(overrides: Partial<PublicInvoicePayment> = {}): PublicInvoicePayment {
  return {
    token: 'tok_1',
    state: 'payable',
    organizationName: 'Voiles du Ponant',
    number: 'FAC-000001',
    clientName: 'Alice Martin',
    total: 120.5,
    currency: 'EUR',
    issuedAt: '2026-07-05',
    dueAt: null,
    returnedFromCheckout: false,
    ...overrides,
  }
}

describe('InvoiceOnlinePaymentCard (#876)', () => {
  beforeEach(() => vi.clearAllMocks())

  test('shows the payment link when one exists', () => {
    const wrapper = mount(InvoiceOnlinePaymentCard, {
      props: {
        invoice: makeInvoice({ onlinePaymentUrl: 'https://app.test/pay/tok_1' }),
        canAcceptOnlinePayments: true,
      },
    })
    const input = wrapper.find('[data-testid="invoice-online-payment-url"]')
    expect((input.element as HTMLInputElement).value).toBe('https://app.test/pay/tok_1')
  })

  test('offers to create the link when the org accepts online payments', async () => {
    const wrapper = mount(InvoiceOnlinePaymentCard, {
      props: { invoice: makeInvoice(), canAcceptOnlinePayments: true },
    })
    await wrapper.find('button').trigger('click')
    expect(mockPost).toHaveBeenCalledWith(
      '/invoices/42/payment-link',
      {},
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('stays hidden when the org is not connected or the invoice is not payable', () => {
    const notConnected = mount(InvoiceOnlinePaymentCard, {
      props: { invoice: makeInvoice(), canAcceptOnlinePayments: false },
    })
    expect(notConnected.find('[data-testid="invoice-online-payment"]').exists()).toBe(false)

    const paid = mount(InvoiceOnlinePaymentCard, {
      props: {
        invoice: makeInvoice({ status: 'paid', paidAt: '2026-08-01' }),
        canAcceptOnlinePayments: true,
      },
    })
    expect(paid.find('[data-testid="invoice-online-payment"]').exists()).toBe(false)
  })
})

describe('SettingsOnlinePayments (#876)', () => {
  beforeEach(() => vi.clearAllMocks())

  test('an admin connects the Stripe account', async () => {
    const wrapper = mount(SettingsOnlinePayments, {
      props: { settings: { available: true, state: 'none', canManage: true } },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    await buttons[0].trigger('click')
    expect(mockFormPost).toHaveBeenCalledWith('/settings/billing/online-payments')
  })

  test('an active account can only be disconnected, after confirmation', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )
    const wrapper = mount(SettingsOnlinePayments, {
      props: { settings: { available: true, state: 'active', canManage: true } },
    })
    expect(wrapper.find('[data-variant="success"]').exists()).toBe(true)
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    await buttons[0].trigger('click')
    expect(mockDelete).toHaveBeenCalledWith('/settings/billing/online-payments', {
      preserveScroll: true,
    })
    vi.unstubAllGlobals()
  })

  test('no action for a non-admin, nor when the feature is unavailable', () => {
    const member = mount(SettingsOnlinePayments, {
      props: { settings: { available: true, state: 'none', canManage: false } },
    })
    expect(member.findAll('button')).toHaveLength(0)

    const unavailable = mount(SettingsOnlinePayments, {
      props: { settings: { available: false, state: 'none', canManage: true } },
    })
    expect(unavailable.findAll('button')).toHaveLength(0)
    expect(unavailable.text()).toContain('settings.billing.onlinePayments.unavailable')
  })
})

describe('pay/show public page (#876)', () => {
  beforeEach(() => vi.clearAllMocks())

  test('a payable invoice opens Checkout', async () => {
    const wrapper = mount(PayShow, { props: { payment: makePayment() } })
    await wrapper.find('[data-testid="invoice-payment-submit"]').trigger('click')
    expect(mockFormPost).toHaveBeenCalledWith('/pay/tok_1/checkout')
  })

  test('a paid invoice, a pending return and an unavailable link show no pay button', () => {
    for (const overrides of [
      { state: 'paid' as const },
      { returnedFromCheckout: true },
      { state: 'unavailable' as const },
    ]) {
      const wrapper = mount(PayShow, { props: { payment: makePayment(overrides) } })
      expect(wrapper.find('[data-testid="invoice-payment-submit"]').exists()).toBe(false)
    }
  })

  test('an unknown token renders the invalid-link card', () => {
    const wrapper = mount(PayShow, { props: { payment: null } })
    expect(wrapper.find('[data-testid="invoice-payment-invalid"]').exists()).toBe(true)
  })
})
