import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import OwnerBoatsShow from '../../inertia/pages/owner/boats/show.vue'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
}))

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

const boat = {
  id: 1,
  name: 'Bora Bora',
  registrationNumber: 'FR-123',
  type: 'sailboat',
  manufacturer: 'Beneteau',
  model: 'Oceanis 40',
  lengthM: 12,
  homePort: 'La Rochelle',
}

const maintenanceEvents = [
  {
    id: 1,
    title: 'Antifouling',
    subject: 'hull',
    notes: null,
    performedAt: '2026-01-01',
    engineCaption: null,
    sailCaption: null,
  },
]

const reservations = [
  {
    id: 1,
    boatId: 1,
    boatName: 'Bora Bora',
    organizationId: 1,
    clientId: null,
    status: 'confirmed' as const,
    startsAt: '2026-02-01T00:00:00.000Z',
    endsAt: '2026-02-08T00:00:00.000Z',
    clientName: 'Alice Martin',
    clientEmail: null,
    clientPhone: null,
    notes: null,
    totalPrice: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    linkedInvoices: [],
  },
]

const invoices = [
  {
    id: 1,
    kind: 'invoice' as const,
    number: 'FAC-000001',
    status: 'paid' as const,
    clientId: null,
    clientName: 'Alice Martin',
    reservationId: 1,
    issuedAt: '2026-01-01',
    dueAt: null,
    paidAt: '2026-01-05',
    sourceQuoteId: null,
    subtotal: 100,
    taxRate: 20,
    taxAmount: 20,
    total: 120,
    currency: 'EUR',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

test('read-only portal renders no action buttons beyond the tab switcher', () => {
  const wrapper = mount(OwnerBoatsShow, {
    props: { boat, maintenanceEvents, reservations, invoices },
  })

  // Only the 3 tab-switcher buttons from BaseTabs should exist — no
  // edit/delete/create action anywhere in the read-only owner portal.
  const buttons = wrapper.findAll('button')
  expect(buttons).toHaveLength(3)
  expect(wrapper.find('form').exists()).toBe(false)
})

test('renders the boat name and defaults to the maintenance tab', () => {
  const wrapper = mount(OwnerBoatsShow, {
    props: { boat, maintenanceEvents, reservations, invoices },
  })

  expect(wrapper.text()).toContain('Bora Bora')
  expect(wrapper.text()).toContain('Antifouling')
})
