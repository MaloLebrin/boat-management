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
  useDateFormat: () => ({ formatDate: (v: string) => `date:${v}` }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({ crewMemberId: '', role: 'crew', patch: vi.fn(), reset: vi.fn() }),
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
}))

import CrewCertificationBadge from '../../inertia/components/crew/CrewCertificationBadge.vue'
import DashboardCrewCertificationsCard from '../../inertia/components/dashboard/DashboardCrewCertificationsCard.vue'
import NavigationLogCrewPanel from '../../inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue'
import type { CrewCertificationRow, DashboardCrewCertifications } from '../../shared/types/crew'

function cert(overrides: Partial<CrewCertificationRow>): CrewCertificationRow {
  return {
    id: 1,
    type: 'medical_certificate',
    referenceNumber: null,
    expiresAt: '2026-10-20',
    isExpired: false,
    expiresInDays: 21,
    status: 'expiring_soon',
    ...overrides,
  }
}

describe('CrewCertificationBadge (#882)', () => {
  test('follows the server status: expired, expiring within 60 days, valid, undated', () => {
    const expired = mount(CrewCertificationBadge, {
      props: { certification: cert({ status: 'expired', isExpired: true, expiresInDays: -4 }) },
    })
    expect(expired.text()).toContain('crew.certStatus.expiredSince(4)')

    // 45 jours : l'ancien badge (seuil 30 j) le disait « valide ».
    const soon = mount(CrewCertificationBadge, {
      props: { certification: cert({ expiresInDays: 45 }) },
    })
    expect(soon.text()).toContain('crew.certStatus.expiresSoon(45)')

    const valid = mount(CrewCertificationBadge, {
      props: { certification: cert({ status: 'valid', expiresInDays: 200 }) },
    })
    expect(valid.text()).toContain('crew.certStatus.valid')

    const undated = mount(CrewCertificationBadge, {
      props: { certification: cert({ status: 'undated', expiresAt: null, expiresInDays: null }) },
    })
    expect(undated.text()).not.toContain('crew.certStatus')
  })
})

describe('NavigationLogCrewPanel — expired certifications (#882)', () => {
  function mountPanel() {
    return mount(NavigationLogCrewPanel, {
      props: {
        boatId: 1,
        logId: 1,
        crew: [
          { crewMemberId: 1, role: 'skipper', fullName: 'Alice' },
          { crewMemberId: 2, role: 'crew', fullName: 'Bruno' },
        ],
        crewMemberOptions: [
          { id: 1, fullName: 'Alice', certificationStatus: 'expired' },
          { id: 2, fullName: 'Bruno', certificationStatus: 'valid' },
          { id: 3, fullName: 'Chloé', certificationStatus: 'expiring_soon' },
          { id: 4, fullName: 'David', certificationStatus: 'expired' },
        ],
        canUpdate: true,
      },
    })
  }

  test('flags the embarked crew member and warns without blocking', () => {
    const w = mountPanel()
    expect(w.findAll('[data-testid="log-crew-expired"]')).toHaveLength(1)
    expect(w.find('[data-testid="log-crew-expired-warning"]').text()).toBe(
      'crew.logCrew.expiredWarning(1)'
    )
  })

  test('the picker labels the members to check', async () => {
    const w = mountPanel()
    const addButton = w.findAll('button').find((b) => b.text().includes('crew.logCrew.add'))!
    await addButton.trigger('click')
    const text = w.text()
    expect(text).toContain('crew.logCrew.optionExpiringSoon(Chloé)')
    expect(text).toContain('crew.logCrew.optionExpired(David)')
  })
})

describe('DashboardCrewCertificationsCard (#882)', () => {
  const summary: DashboardCrewCertifications = {
    expiredCount: 1,
    expiringSoonCount: 1,
    items: [
      {
        crewMemberId: 1,
        crewMemberName: 'Alice Marin',
        certificationId: 10,
        type: 'medical_certificate',
        expiresAt: '2026-09-19',
        expiresInDays: -10,
        status: 'expired',
      },
      {
        crewMemberId: 2,
        crewMemberName: 'Bruno Marin',
        certificationId: 11,
        type: 'stcw_basic',
        expiresAt: '2026-10-11',
        expiresInDays: 12,
        status: 'expiring_soon',
      },
    ],
  }

  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardCrewCertificationsCard, { props: { crewCertifications: undefined } })
    expect(w.find('[data-testid="dashboard-crew-certs-skeleton"]').exists()).toBe(true)
  })

  test('lists the most urgent certifications with their state', () => {
    const w = mount(DashboardCrewCertificationsCard, { props: { crewCertifications: summary } })
    const items = w.findAll('[data-testid="dashboard-crew-certs-item"]')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('Alice Marin')
    expect(items[0]!.text()).toContain('crew.certStatus.expiredSince(10)')
    expect(items[1]!.text()).toContain('crew.certStatus.expiresSoon(12)')
    expect(w.find('[data-testid="dashboard-crew-certs-view-all"]').attributes('href')).toBe('/crew')
  })

  test('says so when every certification is up to date', () => {
    const w = mount(DashboardCrewCertificationsCard, {
      props: { crewCertifications: { expiredCount: 0, expiringSoonCount: 0, items: [] } },
    })
    expect(w.find('[data-testid="dashboard-crew-certs-empty"]').exists()).toBe(true)
  })
})
