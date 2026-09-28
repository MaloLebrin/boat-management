import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockPatch = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => {
  const form: Record<string, unknown> = {
    status: 'available',
    reason: '',
    errors: {},
    processing: false,
    patch: mockPatch,
    clearErrors: vi.fn(),
    transform: vi.fn(() => form),
  }
  return {
    useForm: (initial: Record<string, unknown>) => Object.assign(form, initial),
    usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  }
})

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}(${Object.values(params).join('|')})` : key,
    locale: { value: 'en' },
  }),
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span :data-variant="variant"><slot /></span>', props: ['variant'] },
}))

vi.mock('~/components/base/BaseModal.vue', () => ({
  default: { template: '<div v-if="open"><slot /></div>', props: ['open', 'title'] },
}))

import BoatStatusBadge from '../../inertia/components/boats/BoatStatusBadge.vue'
import BoatStatusModal from '../../inertia/components/boats/show/availability/BoatStatusModal.vue'
import BoatAvailabilityBanner from '../../inertia/components/boats/show/availability/BoatAvailabilityBanner.vue'
import type { BoatAvailabilitySummary } from '#shared/types/boat_status'

describe('BoatStatusBadge (#870)', () => {
  test.each([
    ['available', 'success'],
    ['in_maintenance', 'warning'],
    ['out_of_service', 'danger'],
    ['sold', 'neutral'],
  ] as const)('%s → %s', (status, variant) => {
    const w = mount(BoatStatusBadge, { props: { status } })
    expect(w.text()).toBe(`boats.availability.status.${status}`)
    expect(w.find('[data-variant]').attributes('data-variant')).toBe(variant)
  })
})

describe('BoatStatusModal (#870)', () => {
  beforeEach(() => vi.clearAllMocks())

  const history = [
    {
      id: 1,
      fromStatus: 'available' as const,
      toStatus: 'in_maintenance' as const,
      reason: 'Carénage',
      userName: 'Malo',
      createdAt: '2026-09-01T10:00:00.000Z',
    },
  ]

  test('submits the new status to the status route', async () => {
    const w = mount(BoatStatusModal, {
      props: { boatId: 42, currentStatus: 'available', history: [], open: true },
    })
    await w.find('form').trigger('submit')
    expect(mockPatch).toHaveBeenCalledWith('/boats/42/status', expect.anything())
  })

  test('shows the status history with its reason', () => {
    const w = mount(BoatStatusModal, {
      props: { boatId: 42, currentStatus: 'in_maintenance', history, open: true },
    })
    const text = w.find('[data-testid="boat-status-history"]').text()
    expect(text).toContain('boats.availability.status.in_maintenance')
    expect(text).toContain('Carénage')
  })
})

describe('BoatAvailabilityBanner (#870)', () => {
  const base: BoatAvailabilitySummary = {
    status: 'available',
    statusReason: null,
    statusChangedAt: null,
    windows: [],
  }

  test('renders nothing for an available boat without upcoming window', () => {
    const w = mount(BoatAvailabilityBanner, { props: { availability: base } })
    expect(w.find('[data-testid="boat-availability-banner"]').exists()).toBe(false)
  })

  test('shows the immobilizing status and its reason', () => {
    const w = mount(BoatAvailabilityBanner, {
      props: {
        availability: {
          ...base,
          status: 'out_of_service',
          statusReason: 'Moteur démonté',
          statusChangedAt: '2026-09-03T08:00:00.000Z',
          windows: [
            {
              source: 'status',
              startsAt: null,
              endsAt: null,
              label: 'out_of_service',
              refId: null,
            },
          ],
        },
      },
    })
    const text = w.text()
    expect(text).toContain('boats.availability.banner.immobilized')
    expect(text).toContain('Moteur démonté')
  })

  test('lists upcoming dated tasks and open incidents', () => {
    const w = mount(BoatAvailabilityBanner, {
      props: {
        availability: {
          ...base,
          windows: [
            {
              source: 'task',
              startsAt: '2026-10-12T00:00:00.000Z',
              endsAt: '2026-10-13T00:00:00.000Z',
              label: 'Vidange',
              refId: 1,
            },
            {
              source: 'incident',
              startsAt: '2026-09-20T00:00:00.000Z',
              endsAt: null,
              label: 'engine_failure',
              refId: 2,
            },
          ],
        },
      },
    })
    expect(w.findAll('li')).toHaveLength(2)
    expect(w.text()).toContain('Vidange')
    expect(w.text()).toContain('incidents.type.engine_failure')
  })
})
