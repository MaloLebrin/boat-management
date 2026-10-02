import { mount } from '@vue/test-utils'
import { beforeEach, test, expect, vi } from 'vitest'
import OwnerBoatsShow from '../../inertia/pages/owner/boats/show.vue'
import { UNPAID_RESERVATION_FIELDS } from './helpers/reservation_payment'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
}))

const { routerPost, formPost } = vi.hoisted(() => ({ routerPost: vi.fn(), formPost: vi.fn() }))

vi.mock('@inertiajs/vue3', async () => {
  const { reactive } = await import('vue')
  return {
    Head: { template: '<div><slot /></div>' },
    usePage: () => ({ props: { appT: {}, locale: 'en' } }),
    router: { post: routerPost },
    useForm: (data: Record<string, string>) =>
      reactive({ ...data, errors: {}, processing: false, post: formPost, reset: vi.fn() }),
  }
})

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
    ...UNPAID_RESERVATION_FIELDS,
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
    creditedInvoiceId: null,
    subtotal: 100,
    taxRate: 20,
    taxAmount: 20,
    total: 120,
    currency: 'EUR',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

const dashboard = {
  totalCost12Months: 1840.5,
  costByCategory: [{ category: 'maintenance' as const, total: 1840.5 }],
  upcomingDeadlines: [
    { kind: 'task' as const, id: 3, label: 'Carénage', documentType: null, date: '2026-11-01' },
  ],
  lastTrip: null,
  status: 'available',
  pendingApprovals: 1,
}

const requests = [
  {
    id: 7,
    title: 'Remplacement du guindeau',
    description: null,
    status: 'received' as const,
    requestedByOwner: false,
    dueAt: null,
    doneAt: null,
    estimatedCost: 1200,
    approval: 'pending' as const,
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 8,
    title: 'Vérifier le guindeau',
    description: 'Il force à la remontée.',
    status: 'planned' as const,
    requestedByOwner: true,
    dueAt: '2026-10-15',
    doneAt: null,
    estimatedCost: null,
    approval: null,
    createdAt: '2026-09-20T08:00:00.000Z',
  },
]

const props = {
  boat,
  dashboard,
  maintenanceEvents,
  reservations,
  invoices,
  documents: [],
  expenses: [],
  incidents: [],
  trips: [],
  requests,
}

beforeEach(() => {
  routerPost.mockReset()
  formPost.mockReset()
})

async function openTab(wrapper: ReturnType<typeof mount>, label: string) {
  const tab = wrapper.findAll('button').find((button) => button.text().includes(label))
  await tab!.trigger('click')
}

test('opens on the owner dashboard (#890)', () => {
  const wrapper = mount(OwnerBoatsShow, { props })

  expect(wrapper.text()).toContain('Bora Bora')
  expect(wrapper.find('[data-testid="owner-dashboard"]').exists()).toBe(true)
  expect(wrapper.text()).toContain('Carénage')
})

test('the requests tab offers the request form and posts it to the owned boat', async () => {
  const wrapper = mount(OwnerBoatsShow, { props })
  await openTab(wrapper, 'owner.boats.show.tabs.requests')

  const form = wrapper.find('[data-testid="owner-request-form"]')
  expect(form.exists()).toBe(true)
  await form.trigger('submit')
  expect(formPost).toHaveBeenCalledWith('/owner/boats/1/requests', expect.anything())
})

test('only a pending quote shows the approve and reject actions', async () => {
  const wrapper = mount(OwnerBoatsShow, { props })
  await openTab(wrapper, 'owner.boats.show.tabs.requests')

  expect(wrapper.findAll('[data-testid="owner-request-row"]')).toHaveLength(2)
  expect(wrapper.findAll('[data-testid="owner-approve"]')).toHaveLength(1)

  await wrapper.find('[data-testid="owner-approve"]').trigger('click')
  expect(routerPost).toHaveBeenCalledWith(
    '/owner/boats/1/tasks/7/approve',
    {},
    { preserveScroll: true }
  )

  await wrapper.find('[data-testid="owner-reject"]').trigger('click')
  expect(routerPost).toHaveBeenLastCalledWith(
    '/owner/boats/1/tasks/7/reject',
    {},
    { preserveScroll: true }
  )
})

test('the maintenance history is still one tab away', async () => {
  const wrapper = mount(OwnerBoatsShow, { props })
  await openTab(wrapper, 'owner.boats.show.tabs.maintenance')

  expect(wrapper.text()).toContain('Antifouling')
})
