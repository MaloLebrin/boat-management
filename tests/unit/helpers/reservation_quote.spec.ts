import { test } from '@japa/runner'
import { computeReservationQuote, countBilledNights } from '#shared/helpers/reservation_quote'
import type { BoatPricingRow } from '#shared/types/boat_pricing'
import type { PricingSeasonRow } from '#shared/types/pricing_season'

function pricing(overrides: Partial<BoatPricingRow> = {}): BoatPricingRow {
  return {
    id: 1,
    boatId: 1,
    baseDailyPrice: 100,
    baseWeeklyPrice: null,
    depositAmount: null,
    minDays: null,
    maxDays: null,
    currency: 'EUR',
    createdAt: null,
    updatedAt: null,
    ...overrides,
  }
}

function season(overrides: Partial<PricingSeasonRow> = {}): PricingSeasonRow {
  return {
    id: 1,
    boatId: null,
    boatName: null,
    name: 'Season',
    startsOn: '2026-07-01',
    endsOn: '2026-07-31',
    dailyPrice: null,
    multiplier: null,
    priority: 0,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  }
}

test.group('reservation_quote / countBilledNights', () => {
  test('counts calendar-day difference, ignoring time of day', ({ assert }) => {
    assert.equal(countBilledNights('2026-07-01', '2026-07-04'), 3)
    assert.equal(countBilledNights('2026-07-01T10:00', '2026-07-04T18:00'), 3)
    assert.equal(countBilledNights('2026-07-01', '2026-07-02'), 1)
  })

  test('returns 0 for same-day or reversed ranges', ({ assert }) => {
    assert.equal(countBilledNights('2026-07-01T10:00', '2026-07-01T14:00'), 0)
    assert.equal(countBilledNights('2026-07-04', '2026-07-01'), 0)
  })
})

test.group('reservation_quote / computeReservationQuote', () => {
  test('returns no-pricing quote when the boat has no pricing', ({ assert }) => {
    const q = computeReservationQuote(null, [], '2026-07-01', '2026-07-04')
    assert.isFalse(q.hasPricing)
    assert.equal(q.total, 0)
    assert.equal(q.nights, 3)
    assert.isEmpty(q.lines)
  })

  test('bills the base daily rate when no season and no weekly rate', ({ assert }) => {
    const q = computeReservationQuote(pricing(), [], '2026-07-01', '2026-07-04')
    assert.equal(q.nights, 3)
    assert.equal(q.total, 300)
    assert.isFalse(q.usedWeeklyRate)
    assert.lengthOf(q.lines, 1)
    assert.deepInclude(q.lines[0], { seasonName: null, unitPrice: 100, quantity: 3, amount: 300 })
  })

  test('applies the weekly rate for full weeks (semaine vs jour)', ({ assert }) => {
    const p = pricing({ baseWeeklyPrice: 600 })
    const week = computeReservationQuote(p, [], '2026-07-01', '2026-07-08') // 7 nights
    assert.equal(week.nights, 7)
    assert.equal(week.total, 600)
    assert.isTrue(week.usedWeeklyRate)
    assert.lengthOf(week.lines, 1)
    assert.isTrue(week.lines[0].isWeekly)

    const mixed = computeReservationQuote(p, [], '2026-07-01', '2026-07-11') // 10 nights = 1 week + 3 days
    assert.equal(mixed.total, 900)
    assert.lengthOf(mixed.lines, 2)
    assert.deepInclude(mixed.lines[0], { unitPrice: 600, quantity: 1, isWeekly: true })
    assert.deepInclude(mixed.lines[1], { unitPrice: 100, quantity: 3, isWeekly: false })
  })

  test('mono-season with an absolute daily price', ({ assert }) => {
    const s = season({
      name: 'Haute',
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
      dailyPrice: 150,
    })
    const q = computeReservationQuote(
      pricing({ baseWeeklyPrice: 600 }),
      [s],
      '2026-07-01',
      '2026-07-04'
    )
    assert.equal(q.total, 450) // 3 * 150 — weekly ignored because a season applies
    assert.isFalse(q.usedWeeklyRate)
    assert.lengthOf(q.lines, 1)
    assert.equal(q.lines[0].seasonName, 'Haute')
  })

  test('mono-season with a multiplier over the base rate', ({ assert }) => {
    const s = season({ name: 'x1.5', multiplier: 1.5 })
    const q = computeReservationQuote(
      pricing({ baseDailyPrice: 100 }),
      [s],
      '2026-07-01',
      '2026-07-04'
    )
    assert.equal(q.total, 450) // 3 * (100 * 1.5)
    assert.equal(q.lines[0].unitPrice, 150)
  })

  test('multi-season stay groups nights by applicable rate', ({ assert }) => {
    // Reservation nights: 07-01, 07-02, 07-03. Season covers 07-02..07-10.
    const s = season({
      name: 'Haute',
      startsOn: '2026-07-02',
      endsOn: '2026-07-10',
      dailyPrice: 200,
    })
    const q = computeReservationQuote(
      pricing({ baseDailyPrice: 100 }),
      [s],
      '2026-07-01',
      '2026-07-04'
    )
    assert.equal(q.total, 500) // 100 + 200 + 200
    assert.lengthOf(q.lines, 2)
    assert.deepInclude(q.lines[0], { seasonName: null, unitPrice: 100, quantity: 1 })
    assert.deepInclude(q.lines[1], { seasonName: 'Haute', unitPrice: 200, quantity: 2 })
  })

  test('boat-specific season wins over global on equal priority', ({ assert }) => {
    const global = season({ id: 1, boatId: null, name: 'Global', dailyPrice: 200, priority: 1 })
    const boat = season({ id: 2, boatId: 1, name: 'Boat', dailyPrice: 300, priority: 1 })
    const q = computeReservationQuote(pricing(), [global, boat], '2026-07-01', '2026-07-02')
    assert.equal(q.total, 300)
    assert.equal(q.lines[0].seasonName, 'Boat')
  })

  test('higher priority wins regardless of scope', ({ assert }) => {
    const global = season({ id: 1, boatId: null, name: 'Global', dailyPrice: 500, priority: 9 })
    const boat = season({ id: 2, boatId: 1, name: 'Boat', dailyPrice: 300, priority: 1 })
    const q = computeReservationQuote(pricing(), [global, boat], '2026-07-01', '2026-07-02')
    assert.equal(q.total, 500)
    assert.equal(q.lines[0].seasonName, 'Global')
  })

  test('flags durations below the minimum', ({ assert }) => {
    const q = computeReservationQuote(pricing({ minDays: 5 }), [], '2026-07-01', '2026-07-04')
    assert.isFalse(q.withinBounds)
    assert.equal(q.boundsError, 'below_min')
  })

  test('flags durations above the maximum', ({ assert }) => {
    const q = computeReservationQuote(pricing({ maxDays: 2 }), [], '2026-07-01', '2026-07-04')
    assert.isFalse(q.withinBounds)
    assert.equal(q.boundsError, 'above_max')
  })

  test('passes through deposit and currency', ({ assert }) => {
    const q = computeReservationQuote(
      pricing({ depositAmount: 1500, currency: 'USD' }),
      [],
      '2026-07-01',
      '2026-07-04'
    )
    assert.equal(q.deposit, 1500)
    assert.equal(q.currency, 'USD')
  })
})
