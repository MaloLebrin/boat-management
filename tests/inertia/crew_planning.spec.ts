import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatDate: (v: string) => `date:${v}`,
    formatDayMonth: (v: string) => `dm:${v}`,
    formatWeekdayShort: (v: string) => `wd:${v}`,
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

const post = vi.fn()
vi.mock('@inertiajs/vue3', async () => {
  const { reactive } = await import('vue')
  return {
    useForm: (data: Record<string, unknown>) =>
      reactive({ ...data, errors: {}, processing: false, post, reset: vi.fn() }),
    usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
  }
})

import CrewPlanningGrid from '../../inertia/components/crew/CrewPlanningGrid.vue'
import ReservationCrewAssignForm from '../../inertia/components/reservations/crew/ReservationCrewAssignForm.vue'
import { entriesOnDay, planningDays, shiftDays } from '../../inertia/utils/crew_planning_days'
import type { CrewAvailabilityRow, CrewPlanning, CrewPlanningEntry } from '../../shared/types/crew'

function unavailability(startsAt: string, endsAt: string): CrewPlanningEntry {
  return {
    kind: 'unavailability',
    id: 1,
    startsAt,
    endsAt,
    label: 'Congés',
    role: null,
    boatId: null,
    boatName: null,
  }
}

describe('crew planning days (#883)', () => {
  test('lists every day of the range, bounds included', () => {
    expect(planningDays('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
    expect(shiftDays('2026-10-26', 7)).toBe('2026-11-02')
    expect(shiftDays('2026-11-02', -7)).toBe('2026-10-26')
  })

  test('an unavailability occupies its first and last days', () => {
    const entries = [unavailability('2026-10-10', '2026-10-12')]
    expect(entriesOnDay(entries, '2026-10-09')).toHaveLength(0)
    expect(entriesOnDay(entries, '2026-10-10')).toHaveLength(1)
    expect(entriesOnDay(entries, '2026-10-12')).toHaveLength(1)
    expect(entriesOnDay(entries, '2026-10-13')).toHaveLength(0)
  })
})

describe('CrewPlanningGrid (#883)', () => {
  const planning: CrewPlanning = {
    from: '2026-10-05',
    to: '2026-10-07',
    rows: [
      {
        crewMemberId: 7,
        fullName: 'Yann Le Gall',
        certificationStatus: null,
        entries: [unavailability('2026-10-06', '2026-10-06')],
      },
    ],
  }

  test('renders one row per crew member and one column per day', () => {
    const wrapper = mount(CrewPlanningGrid, { props: { planning } })
    expect(wrapper.text()).toContain('Yann Le Gall')
    expect(wrapper.findAll('thead th')).toHaveLength(4)
    expect(wrapper.find('a').attributes('href')).toBe('/crew/7')
  })

  test('marks the unavailable day only', () => {
    const wrapper = mount(CrewPlanningGrid, { props: { planning } })
    const off = wrapper.find('[data-testid="crew-cell-7-2026-10-06"]')
    const free = wrapper.find('[data-testid="crew-cell-7-2026-10-05"]')
    expect(off.text()).toBe('crew.planning.calendar.offShort')
    expect(off.attributes('title')).toContain('Congés')
    expect(free.text()).toBe('')
  })
})

describe('ReservationCrewAssignForm (#883)', () => {
  const availability: CrewAvailabilityRow[] = [
    {
      id: 1,
      fullName: 'Pris Ailleurs',
      certificationStatus: null,
      certificationLapses: false,
      available: false,
      conflicts: [
        {
          kind: 'reservation',
          id: 9,
          startsAt: '2026-10-05T08:00:00.000Z',
          endsAt: '2026-10-07T08:00:00.000Z',
          label: 'Lagoon — Bob',
        },
      ],
    },
    {
      id: 2,
      fullName: 'Libre Comme',
      certificationStatus: 'expired',
      certificationLapses: true,
      available: true,
      conflicts: [],
    },
  ]

  function mountForm() {
    return mount(ReservationCrewAssignForm, {
      props: { boatId: 3, reservationId: 4, availability, defaultRole: 'skipper' as const },
    })
  }

  test('lists available crew first and disables the busy ones with their conflict', () => {
    const wrapper = mountForm()
    const options = wrapper.findAll('[data-testid^="crew-option-"]')
    expect(options.map((o) => o.attributes('data-testid'))).toEqual([
      'crew-option-2',
      'crew-option-1',
    ])
    const busy = wrapper.find('[data-testid="crew-option-1"] input')
    expect(busy.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="crew-option-1"]').text()).toContain('Lagoon — Bob')
  })

  test('flags an expired certification without blocking the pick', () => {
    const wrapper = mountForm()
    const free = wrapper.find('[data-testid="crew-option-2"]')
    expect(free.text()).toContain('crew.memberStatus.expired')
    expect(free.text()).toContain('crew.planning.certificationLapses')
    expect(free.find('input').attributes('disabled')).toBeUndefined()
  })

  test('posts the picked member with the default role', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-testid="crew-option-2"] input').setValue(true)
    await wrapper.find('form').trigger('submit')
    expect(post).toHaveBeenCalledWith('/boats/3/reservations/4/crew', expect.any(Object))
  })
})
