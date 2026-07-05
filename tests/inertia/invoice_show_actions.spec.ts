import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { InvoiceDetail } from '../../shared/types/invoice'

const mockPost = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { post: mockPost, delete: mockDelete },
  usePage: () => ({ props: { appT: {}, locale: 'en', flash: {} } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

vi.mock('~/components/base/BaseAlert.vue', () => ({
  default: { template: '<div class="alert"><slot /></div>', props: ['variant', 'dismissible'] },
}))
vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'type', 'disabled'],
  },
}))
vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))
vi.mock('~/components/base/BaseConfirmModal.vue', () => ({
  default: {
    template: '<div />',
    props: ['open', 'title', 'message', 'confirmLabel', 'cancelLabel'],
  },
}))
vi.mock('~/components/base/BaseHeading.vue', () => ({
  default: { template: '<h1><slot /></h1>', props: ['level'] },
}))
vi.mock('~/components/invoices/InvoiceStatusBadge.vue', () => ({
  default: { template: '<span />', props: ['status'] },
}))

import InvoiceShow from '../../inertia/pages/invoices/show.vue'

const invoice: InvoiceDetail = {
  id: 42,
  kind: 'quote',
  number: 'DEV-000001',
  status: 'draft',
  clientId: null,
  clientName: 'Alice Martin',
  reservationId: null,
  issuedAt: '2026-07-05',
  dueAt: null,
  subtotal: 100,
  taxRate: 20,
  taxAmount: 20,
  total: 120,
  currency: 'EUR',
  createdAt: null,
  notes: null,
  lines: [{ id: 1, label: 'Location', quantity: 1, unitPrice: 100, amount: 100, position: 0 }],
}

function mountShow() {
  return mount(InvoiceShow, { props: { invoice, canDelete: false } })
}

describe('invoices/show.vue actions', () => {
  beforeEach(() => vi.clearAllMocks())

  test('exposes a PDF download link to /invoices/:id/pdf', () => {
    const wrapper = mountShow()
    const link = wrapper.find('a[href="/invoices/42/pdf"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('target')).toBe('_blank')
  })

  test('clicking "send by email" posts to /invoices/:id/send', async () => {
    const wrapper = mountShow()
    const sendBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('invoices.actions.sendEmail'))
    expect(sendBtn).toBeDefined()
    await sendBtn!.trigger('click')
    expect(mockPost).toHaveBeenCalledWith(
      '/invoices/42/send',
      {},
      expect.objectContaining({ preserveScroll: true })
    )
  })
})
