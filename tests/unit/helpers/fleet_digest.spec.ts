import { test } from '@japa/runner'
import { emptyCostBreakdown } from '#shared/helpers/reporting'
import {
  fleetDigestEnabled,
  isFleetDigestEligible,
  isMonthlyReportEmpty,
  isWeeklyDigestEmpty,
  previousMonth,
  scopeWeeklyDigest,
  weeklyDigestWindow,
} from '#shared/helpers/fleet_digest'
import type { MonthlyFleetReport, WeeklyFleetDigest } from '#shared/types/fleet_digest'

/** Règles pures des rapports de flotte par e-mail (#871). */

const EMPTY = { total: 0, items: [] }

function digest(overrides: Partial<WeeklyFleetDigest> = {}): WeeklyFleetDigest {
  return {
    organization: { id: 1, name: 'Org', currency: 'EUR' },
    week: '2026-W42',
    upcoming: { from: '2026-10-12', to: '2026-10-18' },
    past: { from: '2026-10-05', to: '2026-10-11' },
    overdueTasks: EMPTY,
    upcomingTasks: EMPTY,
    openIncidents: EMPTY,
    expiring: EMPTY,
    reservations: null,
    expenses: emptyCostBreakdown(),
    overdueInvoices: null,
    ...overrides,
  }
}

function report(overrides: Partial<MonthlyFleetReport> = {}): MonthlyFleetReport {
  return {
    organization: { id: 1, name: 'Org', currency: 'EUR' },
    month: '2026-09',
    period: { preset: 'month', from: '2026-09-01', to: '2026-09-30', days: 30 },
    costs: emptyCostBreakdown(),
    previousCosts: 0,
    topCategories: [],
    engineHours: 0,
    distanceNm: 0,
    maintenance: { planned: 0, completed: 0, performed: 0 },
    rental: null,
    boats: [],
    ...overrides,
  }
}

const task = { id: 1, title: 'Vidange', boatId: 1, boatName: 'Ondine', dueAt: '2026-10-01' }

test.group('fleetDigestEnabled', () => {
  test('admins by default, other staff only when they asked', ({ assert }) => {
    assert.isTrue(fleetDigestEnabled('weekly', 'admin', null))
    assert.isFalse(fleetDigestEnabled('weekly', 'admin', false))
    assert.isFalse(fleetDigestEnabled('weekly', 'member', null))
    assert.isTrue(fleetDigestEnabled('weekly', 'member', true))
    assert.isTrue(fleetDigestEnabled('weekly', 'mechanic', true))
  })

  test('a role that cannot receive a report never gets it, whatever the choice', ({ assert }) => {
    assert.isFalse(fleetDigestEnabled('weekly', 'boat_owner', true))
    assert.isFalse(fleetDigestEnabled('monthly', 'member', true))
    assert.isTrue(isFleetDigestEligible('monthly', 'admin'))
    assert.isFalse(isFleetDigestEligible('monthly', 'mechanic'))
  })
})

test.group('scopeWeeklyDigest', () => {
  const full = digest({
    overdueTasks: { total: 1, items: [task] },
    openIncidents: { total: 2, items: [] },
    expiring: { total: 1, items: [] },
    reservations: { total: 1, items: [] },
    expenses: { ...emptyCostBreakdown(), fuel: 50, total: 50 },
    overdueInvoices: { total: 1, items: [] },
  })

  test('an admin reads everything', ({ assert }) => {
    assert.deepEqual(scopeWeeklyDigest(full, 'admin'), full)
  })

  test('a member reads everything but the fleet expenses', ({ assert }) => {
    const scoped = scopeWeeklyDigest(full, 'member')
    assert.equal(scoped.overdueInvoices?.total, 1)
    assert.equal(scoped.reservations?.total, 1)
    assert.equal(scoped.expenses.total, 0)
  })

  test('a mechanic reads maintenance only', ({ assert }) => {
    const scoped = scopeWeeklyDigest(full, 'mechanic')
    assert.equal(scoped.overdueTasks.total, 1)
    assert.equal(scoped.openIncidents.total, 0)
    assert.equal(scoped.expiring.total, 0)
    assert.isNull(scoped.reservations)
    assert.isNull(scoped.overdueInvoices)
    assert.equal(scoped.expenses.total, 0)
  })
})

test.group('isWeeklyDigestEmpty / isMonthlyReportEmpty', () => {
  test('a digest without any section is empty', ({ assert }) => {
    assert.isTrue(isWeeklyDigestEmpty(digest()))
    assert.isTrue(isWeeklyDigestEmpty(digest({ reservations: EMPTY, overdueInvoices: EMPTY })))
    assert.isFalse(isWeeklyDigestEmpty(digest({ upcomingTasks: { total: 1, items: [task] } })))
    assert.isFalse(
      isWeeklyDigestEmpty(digest({ expenses: { ...emptyCostBreakdown(), port: 10, total: 10 } }))
    )
  })

  test('a month without costs, hours, maintenance or rental is empty', ({ assert }) => {
    assert.isTrue(isMonthlyReportEmpty(report()))
    assert.isTrue(
      isMonthlyReportEmpty(report({ rental: { revenue: 0, rentalDays: 0, occupancyRate: 0 } }))
    )
    assert.isFalse(isMonthlyReportEmpty(report({ engineHours: 3 })))
    assert.isFalse(
      isMonthlyReportEmpty(report({ maintenance: { planned: 1, completed: 0, performed: 0 } }))
    )
    assert.isFalse(
      isMonthlyReportEmpty(report({ rental: { revenue: 0, rentalDays: 2, occupancyRate: 7 } }))
    )
  })
})

test.group('weeklyDigestWindow / previousMonth', () => {
  test('the ISO week of the sending day and the one before', ({ assert }) => {
    assert.deepEqual(weeklyDigestWindow('2026-10-12'), {
      week: '2026-W42',
      upcoming: { from: '2026-10-12', to: '2026-10-18' },
      past: { from: '2026-10-05', to: '2026-10-11' },
    })
    // Un envoi tardif (job relancé le mercredi) garde la même semaine — et la même clé.
    assert.equal(weeklyDigestWindow('2026-10-14').week, '2026-W42')
    // Semaine à cheval sur deux années : l'année ISO.
    assert.equal(weeklyDigestWindow('2027-01-01').week, '2026-W53')
  })

  test('the calendar month before the given day', ({ assert }) => {
    assert.equal(previousMonth('2026-10-01'), '2026-09')
    assert.equal(previousMonth('2026-01-01'), '2025-12')
  })
})
