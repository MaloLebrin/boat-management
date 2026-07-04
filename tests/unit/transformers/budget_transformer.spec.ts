import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toBudgetEntryItem, toPortStayItem } from '#transformers/budget_transformer'
import type BoatBudgetEntry from '#models/boat_budget_entry'
import type BoatPortStay from '#models/boat_port_stay'

function makeBudgetEntry(overrides: Partial<BoatBudgetEntry> = {}): BoatBudgetEntry {
  return {
    id: 1,
    boatId: 5,
    amount: '250.75',
    date: DateTime.fromISO('2026-07-04'),
    label: 'Fuel refill',
    category: 'fuel',
    description: 'Diesel top-up',
    ...overrides,
  } as unknown as BoatBudgetEntry
}

function makePortStay(overrides: Partial<BoatPortStay> = {}): BoatPortStay {
  return {
    id: 2,
    boatId: 5,
    portName: 'Port de Nice',
    startedAt: DateTime.fromISO('2026-07-01'),
    endedAt: DateTime.fromISO('2026-07-05'),
    cost: '150.50',
    notes: 'Nice weather',
    ...overrides,
  } as unknown as BoatPortStay
}

test.group('toBudgetEntryItem', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const entry = makeBudgetEntry()
    const result = toBudgetEntryItem(entry)

    assert.equal(result.id, 1)
    assert.equal(result.amount, 250.75)
    assert.equal(result.date, '2026-07-04')
    assert.equal(result.label, 'Fuel refill')
    assert.equal(result.category, 'fuel')
    assert.equal(result.description, 'Diesel top-up')
  })

  test('amount is parsed as float', ({ assert }) => {
    const entry = makeBudgetEntry({ amount: '1234.56' })
    const result = toBudgetEntryItem(entry)
    assert.equal(result.amount, 1234.56)
  })

  test('description null stays null', ({ assert }) => {
    const entry = makeBudgetEntry({ description: null })
    const result = toBudgetEntryItem(entry)
    assert.isNull(result.description)
  })

  test('date is ISO date string', ({ assert }) => {
    const entry = makeBudgetEntry()
    const result = toBudgetEntryItem(entry)
    assert.equal(result.date, '2026-07-04')
  })
})

test.group('toPortStayItem', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const stay = makePortStay()
    const result = toPortStayItem(stay)

    assert.equal(result.id, 2)
    assert.equal(result.portName, 'Port de Nice')
    assert.equal(result.startedAt, '2026-07-01')
    assert.equal(result.endedAt, '2026-07-05')
    assert.equal(result.cost, 150.5)
    assert.equal(result.notes, 'Nice weather')
  })

  test('endedAt null returns null', ({ assert }) => {
    const stay = makePortStay({ endedAt: null })
    const result = toPortStayItem(stay)
    assert.isNull(result.endedAt)
  })

  test('cost null returns null', ({ assert }) => {
    const stay = makePortStay({ cost: null })
    const result = toPortStayItem(stay)
    assert.isNull(result.cost)
  })

  test('cost numeric string is parsed as float', ({ assert }) => {
    const stay = makePortStay({ cost: '99.99' })
    const result = toPortStayItem(stay)
    assert.equal(result.cost, 99.99)
  })

  test('notes null stays null', ({ assert }) => {
    const stay = makePortStay({ notes: null })
    const result = toPortStayItem(stay)
    assert.isNull(result.notes)
  })
})
