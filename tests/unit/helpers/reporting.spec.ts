import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  emptyRawMetrics,
  finalizeMetrics,
  previousReportPeriod,
  reportMonths,
  resolveReportPeriod,
  splitRental,
} from '#shared/helpers/reporting'
import { reportDelta } from '#shared/helpers/reporting_delta'

const TODAY = '2026-06-15'
const utc = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' })

test.group('Reporting (#887) — périodes', () => {
  test('resolves each preset around today', ({ assert }) => {
    assert.deepInclude(resolveReportPeriod('month', TODAY), {
      from: '2026-06-01',
      to: '2026-06-30',
    })
    assert.deepInclude(resolveReportPeriod('quarter', TODAY), {
      from: '2026-04-01',
      to: '2026-06-30',
      days: 91,
    })
    assert.deepInclude(resolveReportPeriod('year', TODAY), {
      from: '2026-01-01',
      to: '2026-12-31',
      days: 365,
    })
    assert.deepInclude(resolveReportPeriod('rolling12', TODAY), {
      from: '2025-07-01',
      to: '2026-06-30',
    })
  })

  test('keeps a valid custom range and falls back to the month otherwise', ({ assert }) => {
    assert.deepEqual(
      resolveReportPeriod('custom', TODAY, { from: '2026-03-10', to: '2026-03-20' }),
      { preset: 'custom', from: '2026-03-10', to: '2026-03-20', days: 11 }
    )
    // Inversée, incomplète, invalide ou trop longue : mois courant.
    for (const custom of [
      { from: '2026-03-20', to: '2026-03-10' },
      { from: '2026-03-10' },
      { from: 'nope', to: '2026-03-10' },
      { from: '2020-01-01', to: '2026-01-01' },
    ]) {
      assert.deepInclude(resolveReportPeriod('custom', TODAY, custom), {
        preset: 'month',
        from: '2026-06-01',
      })
    }
  })

  test('previous period shifts presets by one step and custom ranges by their length', ({
    assert,
  }) => {
    assert.deepInclude(previousReportPeriod(resolveReportPeriod('month', '2026-03-15')), {
      from: '2026-02-01',
      to: '2026-02-28',
    })
    assert.deepInclude(previousReportPeriod(resolveReportPeriod('quarter', TODAY)), {
      from: '2026-01-01',
      to: '2026-03-31',
    })
    assert.deepInclude(previousReportPeriod(resolveReportPeriod('year', TODAY)), {
      from: '2025-01-01',
      to: '2025-12-31',
    })
    const custom = resolveReportPeriod('custom', TODAY, { from: '2026-03-10', to: '2026-03-20' })
    assert.deepInclude(previousReportPeriod(custom), {
      from: '2026-02-27',
      to: '2026-03-09',
      days: 11,
    })
  })

  test('lists the months covered by a period', ({ assert }) => {
    const period = resolveReportPeriod('custom', TODAY, { from: '2025-11-20', to: '2026-02-03' })
    assert.deepEqual(reportMonths(period), ['2025-11', '2025-12', '2026-01', '2026-02'])
  })
})

test.group('Reporting (#887) — prorata des locations', () => {
  test('splits a rental across months in proportion to the days', ({ assert }) => {
    const period = resolveReportPeriod('custom', TODAY, { from: '2026-05-01', to: '2026-06-30' })
    const slices = splitRental(utc('2026-05-27T00:00'), utc('2026-06-06T00:00'), 1000, period)

    assert.deepEqual(
      slices.map((s) => s.month),
      ['2026-05', '2026-06']
    )
    assert.equal(slices[0]!.days, 5)
    assert.equal(slices[0]!.revenue, 500)
    assert.equal(slices[1]!.revenue, 500)
  })

  test('clips a rental to the period', ({ assert }) => {
    const june = resolveReportPeriod('month', TODAY)
    const slices = splitRental(utc('2026-06-28T00:00'), utc('2026-07-08T00:00'), 1000, june)

    assert.lengthOf(slices, 1)
    assert.equal(slices[0]!.days, 3)
    assert.equal(slices[0]!.revenue, 300)
  })

  test('counts days without revenue when the price is unknown, nothing outside the period', ({
    assert,
  }) => {
    const june = resolveReportPeriod('month', TODAY)
    assert.equal(splitRental(utc('2026-06-01'), utc('2026-06-03'), null, june)[0]!.revenue, 0)
    assert.lengthOf(splitRental(utc('2026-07-01'), utc('2026-07-03'), 500, june), 0)
    assert.lengthOf(splitRental(utc('2026-06-03'), utc('2026-06-03'), 500, june), 0)
  })
})

test.group('Reporting (#887) — indicateurs', () => {
  test('derives margin, occupancy and unit costs, never dividing by zero', ({ assert }) => {
    const raw = emptyRawMetrics()
    raw.costs.fuel = 300
    raw.costs.total = 300
    raw.rentalRevenue = 1000
    raw.rentalDays = 15
    raw.engineHours = 12

    const metrics = finalizeMetrics(raw, 2, 30)

    assert.equal(metrics.margin, 700)
    assert.equal(metrics.occupancyRate, 25)
    assert.equal(metrics.costPerRentalDay, 20)
    assert.equal(metrics.costPerEngineHour, 25)
    assert.isNull(metrics.costPerNauticalMile)
    assert.equal(finalizeMetrics(emptyRawMetrics(), 0, 30).occupancyRate, 0)
  })

  test('reports the change against the previous period', ({ assert }) => {
    assert.equal(reportDelta(150, 100), 50)
    assert.equal(reportDelta(50, 100), -50)
    assert.equal(reportDelta(-50, -100), 50)
    assert.isNull(reportDelta(100, 0))
  })
})
