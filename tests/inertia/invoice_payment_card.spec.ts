import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { InvoiceDetail } from '../../shared/types/invoice'

const mockPatch = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { patch: mockPatch },
  usePage: () => ({ props: { appT: {}, locale: 'en', flash: {} } }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" :disabled="disabled"><slot /></button>',
    props: ['variant', 'size', 'type', 'disabled'],
  },
}))
vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))
vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'label', 'hint', 'name', 'id', 'type'],
  },
}))
vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template:
      '<select :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: [
      'modelValue',
      'label',
      'name',
      'id',
      'options',
      'disabled',
      'allowEmpty',
      'placeholder',
    ],
  },
}))

import InvoicePaymentCard from '../../inertia/components/invoices/InvoicePaymentCard.vue'

function makeInvoice(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    id: 42,
    kind: 'invoice',
    number: 'FAC-000001',
    status: 'paid',
    clientId: null,
    clientName: 'Alice Martin',
    reservationId: null,
    issuedAt: '2026-07-05',
    dueAt: null,
    paidAt: '2026-08-12',
    paymentMethod: 'transfer',
    sourceQuoteId: null,
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
    ...overrides,
  }
}

/**
 * Le bloc paiement d'une facture émise (#717) : la seule écriture encore
 * permise, par une visite Inertia `router.patch` (pas de `fetch` + CSRF manuel).
 */
describe('InvoicePaymentCard', () => {
  beforeEach(() => vi.clearAllMocks())

  test('prefills the recorded payment', () => {
    const wrapper = mount(InvoicePaymentCard, { props: { invoice: makeInvoice() } })

    expect(wrapper.find('input').element.value).toBe('2026-08-12')
  })

  test('submitting patches /invoices/:id/payment with the date and the method', async () => {
    const wrapper = mount(InvoicePaymentCard, { props: { invoice: makeInvoice() } })

    await wrapper.find('form').trigger('submit')

    expect(mockPatch).toHaveBeenCalledWith(
      '/invoices/42/payment',
      { paidAt: '2026-08-12', paymentMethod: 'transfer' },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('clearing the date sends a null payment — no method left behind', async () => {
    const wrapper = mount(InvoicePaymentCard, { props: { invoice: makeInvoice() } })

    await wrapper.find('input').setValue('')
    await wrapper.find('form').trigger('submit')

    expect(mockPatch).toHaveBeenCalledWith(
      '/invoices/42/payment',
      { paidAt: null, paymentMethod: null },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('an unpaid invoice opens with an empty, method-less form', async () => {
    const wrapper = mount(InvoicePaymentCard, {
      props: { invoice: makeInvoice({ status: 'sent', paidAt: null, paymentMethod: null }) },
    })

    expect(wrapper.find('input').element.value).toBe('')
    // Pas de date ⇒ pas de moyen de paiement à choisir.
    expect(wrapper.find('select').attributes('disabled')).toBeDefined()
  })
})
