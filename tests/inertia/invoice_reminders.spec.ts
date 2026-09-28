import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { InvoiceDetail } from '../../shared/types/invoice'
import type {
  InvoiceRemindersInfo,
  InvoiceRemindersSettings,
} from '../../shared/types/invoice_reminder'

const mockPost = vi.hoisted(() => vi.fn())
const mockPatch = vi.hoisted(() => vi.fn())
const mockFormPatch = vi.hoisted(() => vi.fn())
const transformed = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('@inertiajs/vue3', async () => {
  const { reactive } = await import('vue')
  return {
    Head: { template: '<div><slot /></div>' },
    router: { post: mockPost, delete: vi.fn(), patch: mockPatch },
    usePage: () => ({ props: { appT: {}, locale: 'en', flash: {}, errors: {} } }),
    useForm: (data: Record<string, unknown>) => {
      const form = reactive({
        ...data,
        errors: {},
        processing: false,
        transform(fn: (d: Record<string, unknown>) => unknown) {
          transformed.value = fn({ ...data, ...pick(form, Object.keys(data)) })
          return form
        },
        patch: mockFormPatch,
      })
      return form
    },
  }
})

function pick(source: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, source[key]]))
}

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import InvoiceRemindersCard from '../../inertia/components/invoices/InvoiceRemindersCard.vue'
import SettingsInvoiceReminders from '../../inertia/components/settings/SettingsInvoiceReminders.vue'

function makeInvoice(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    id: 42,
    kind: 'invoice',
    number: 'FAC-000001',
    status: 'overdue',
    clientId: 7,
    clientName: 'Alice Martin',
    reservationId: null,
    issuedAt: '2026-07-05',
    dueAt: '2026-08-05',
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
    reminderCount: 0,
    notes: null,
    lines: [],
    sourceQuote: null,
    convertedInvoice: null,
    reservationBoatId: null,
    onlinePaymentUrl: null,
    creditedInvoice: null,
    creditNotes: [],
    creditedTotal: 0,
    balanceDue: 120,
    ...overrides,
  }
}

function makeReminders(overrides: Partial<InvoiceRemindersInfo> = {}): InvoiceRemindersInfo {
  return {
    count: 0,
    lastReminderAt: null,
    disabled: false,
    automaticEnabled: true,
    history: [],
    ...overrides,
  }
}

beforeEach(() => {
  mockPost.mockClear()
  mockPatch.mockClear()
  mockFormPatch.mockClear()
})

describe('InvoiceRemindersCard (#878)', () => {
  test('an overdue invoice can be reminded now', async () => {
    const wrapper = mount(InvoiceRemindersCard, {
      props: { invoice: makeInvoice(), reminders: makeReminders() },
    })

    await wrapper.find('[data-testid="invoice-reminders-send"]').trigger('click')

    expect(mockPost).toHaveBeenCalledWith(
      '/invoices/42/reminders',
      {},
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('no « remind now » when not overdue, disabled or read-only', () => {
    for (const props of [
      { invoice: makeInvoice({ status: 'sent' }), reminders: makeReminders() },
      { invoice: makeInvoice(), reminders: makeReminders({ disabled: true }) },
      { invoice: makeInvoice(), reminders: makeReminders(), readOnly: true },
    ]) {
      const wrapper = mount(InvoiceRemindersCard, { props })
      expect(wrapper.find('[data-testid="invoice-reminders-send"]').exists()).toBe(false)
    }
  })

  test('the switch turns reminders off for a client in dispute', async () => {
    const wrapper = mount(InvoiceRemindersCard, {
      props: { invoice: makeInvoice(), reminders: makeReminders() },
    })

    await wrapper.find('[data-testid="invoice-reminders-toggle"] button').trigger('click')

    expect(mockPatch).toHaveBeenCalledWith(
      '/invoices/42/reminders',
      { disabled: true },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('the switch is hidden once the invoice is paid', () => {
    const wrapper = mount(InvoiceRemindersCard, {
      props: { invoice: makeInvoice({ status: 'paid' }), reminders: makeReminders() },
    })
    expect(wrapper.find('[data-testid="invoice-reminders-toggle"]').exists()).toBe(false)
  })

  test('the history tells a sent reminder from one that could not be sent', () => {
    const wrapper = mount(InvoiceRemindersCard, {
      props: {
        invoice: makeInvoice(),
        reminders: makeReminders({
          count: 1,
          lastReminderAt: '2026-08-08T06:30:00.000+02:00',
          history: [
            {
              id: 2,
              tier: 2,
              trigger: 'automatic',
              outcome: 'skipped',
              skipReason: 'no_email',
              userName: null,
              createdAt: '2026-08-15T06:30:00.000+02:00',
            },
            {
              id: 1,
              tier: 1,
              trigger: 'manual',
              outcome: 'sent',
              skipReason: null,
              userName: 'Malo',
              createdAt: '2026-08-08T06:30:00.000+02:00',
            },
          ],
        }),
      },
    })

    const skipped = wrapper.find('[data-testid="invoice-reminder-2"]')
    expect(skipped.text()).toContain('invoices.reminders.skipped')
    expect(skipped.find('.text-warning').exists()).toBe(true)
    expect(wrapper.find('[data-testid="invoice-reminder-1"]').text()).toContain(
      'invoices.reminders.by'
    )
  })

  test('says when automatic reminders are off for the organization', () => {
    const wrapper = mount(InvoiceRemindersCard, {
      props: { invoice: makeInvoice(), reminders: makeReminders({ automaticEnabled: false }) },
    })
    expect(wrapper.text()).toContain('invoices.reminders.automaticOff')
  })
})

function makeSettings(overrides: Partial<InvoiceRemindersSettings> = {}): InvoiceRemindersSettings {
  return {
    enabled: false,
    message: null,
    latePenaltyNote: null,
    tiers: [3, 10, 30],
    available: true,
    canManage: true,
    ...overrides,
  }
}

describe('SettingsInvoiceReminders (#878)', () => {
  test('an admin turns reminders on and saves', async () => {
    const wrapper = mount(SettingsInvoiceReminders, { props: { settings: makeSettings() } })

    await wrapper.find('[data-testid="invoice-reminders-enabled"] button').trigger('click')
    await wrapper.find('textarea#invoice-reminder-message').setValue('  Appelez-nous.  ')
    await wrapper.find('form').trigger('submit')

    expect(mockFormPatch).toHaveBeenCalledWith(
      '/settings/billing/invoice-reminders',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(transformed.value).toEqual({
      enabled: true,
      message: 'Appelez-nous.',
      latePenaltyNote: null,
    })
  })

  test('a member sees the settings but cannot change them', () => {
    const wrapper = mount(SettingsInvoiceReminders, {
      props: { settings: makeSettings({ canManage: false }) },
    })
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('settings.billing.invoiceReminders.adminOnly')
  })

  test('without the invoicing module the form is not offered', () => {
    const wrapper = mount(SettingsInvoiceReminders, {
      props: { settings: makeSettings({ available: false }) },
    })
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('settings.billing.invoiceReminders.unavailable')
  })
})
