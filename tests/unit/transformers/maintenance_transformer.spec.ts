import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toMaintenanceTask, toMaintenanceSheet } from '#transformers/maintenance_transformer'
import type BoatMaintenanceTask from '#models/boat_maintenance_task'
import type BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import type BoatMaintenanceSheetItem from '#models/boat_maintenance_sheet_item'

function makeTask(overrides: Partial<BoatMaintenanceTask> = {}): BoatMaintenanceTask {
  return {
    id: 1,
    boatId: 10,
    subject: 'engine',
    title: 'Change oil',
    notes: 'Use 5W30',
    status: 'open',
    dueAt: DateTime.fromISO('2026-08-01'),
    dueEngineHours: 500,
    doneAt: null,
    doneEngineHours: null,
    lastDoneEngineHours: null,
    boatEngineId: 3,
    boatSailId: null,
    boatRigId: null,
    recurrenceIntervalMonths: 12,
    recurrenceIntervalEngineHours: null,
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z'),
    ...overrides,
  } as unknown as BoatMaintenanceTask
}

function makeSheetItem(
  overrides: Partial<BoatMaintenanceSheetItem> = {}
): BoatMaintenanceSheetItem {
  return {
    id: 1,
    label: 'Check oil level',
    isDone: false,
    notes: null,
    position: 1,
    ...overrides,
  } as unknown as BoatMaintenanceSheetItem
}

function makeSheet(overrides: Partial<BoatMaintenanceSheet> = {}): BoatMaintenanceSheet {
  return {
    id: 5,
    boatId: 10,
    type: 'entretien',
    title: 'Annual check',
    status: 'in_progress',
    performedAt: DateTime.fromISO('2026-07-04'),
    notes: 'Everything ok',
    items: [],
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z'),
    ...overrides,
  } as unknown as BoatMaintenanceSheet
}

test.group('toMaintenanceTask', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const task = makeTask()
    const result = toMaintenanceTask(task)

    assert.equal(result.id, 1)
    assert.equal(result.boatId, 10)
    assert.equal(result.subject, 'engine')
    assert.equal(result.title, 'Change oil')
    assert.equal(result.notes, 'Use 5W30')
    assert.equal(result.status, 'open')
    assert.equal(result.dueAt, '2026-08-01')
    assert.equal(result.dueEngineHours, 500)
    assert.isNull(result.doneAt)
    assert.isNull(result.doneEngineHours)
    assert.isNull(result.lastDoneEngineHours)
    assert.equal(result.boatEngineId, 3)
    assert.isNull(result.boatSailId)
    assert.isNull(result.boatRigId)
    assert.equal(result.recurrenceIntervalMonths, 12)
    assert.isNull(result.recurrenceIntervalEngineHours)
    assert.isString(result.createdAt)
  })

  test('dueAt null returns null', ({ assert }) => {
    const task = makeTask({ dueAt: null })
    const result = toMaintenanceTask(task)
    assert.isNull(result.dueAt)
  })

  test('doneAt present returns ISODate string', ({ assert }) => {
    const task = makeTask({ doneAt: DateTime.fromISO('2026-06-01') })
    const result = toMaintenanceTask(task)
    assert.equal(result.doneAt, '2026-06-01')
  })

  test('updatedAt null returns null', ({ assert }) => {
    const task = makeTask({ updatedAt: null })
    const result = toMaintenanceTask(task)
    assert.isNull(result.updatedAt)
  })

  test('status done is preserved', ({ assert }) => {
    const task = makeTask({ status: 'done' })
    const result = toMaintenanceTask(task)
    assert.equal(result.status, 'done')
  })
})

test.group('toMaintenanceSheet', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const sheet = makeSheet()
    const result = toMaintenanceSheet(sheet)

    assert.equal(result.id, 5)
    assert.equal(result.boatId, 10)
    assert.equal(result.type, 'entretien')
    assert.equal(result.title, 'Annual check')
    assert.equal(result.status, 'in_progress')
    assert.equal(result.performedAt, '2026-07-04')
    assert.equal(result.notes, 'Everything ok')
    assert.isArray(result.items)
    assert.lengthOf(result.items, 0)
    assert.isString(result.createdAt)
  })

  test('items undefined defaults to empty array', ({ assert }) => {
    const sheet = makeSheet({ items: undefined as unknown as BoatMaintenanceSheet['items'] })
    const result = toMaintenanceSheet(sheet)
    assert.lengthOf(result.items, 0)
  })

  test('items are mapped correctly', ({ assert }) => {
    const item = makeSheetItem({ id: 7, label: 'Check belts', isDone: true, position: 2 })
    const sheet = makeSheet({ items: [item] as unknown as BoatMaintenanceSheet['items'] })
    const result = toMaintenanceSheet(sheet)

    assert.lengthOf(result.items, 1)
    assert.equal(result.items[0]!.id, 7)
    assert.equal(result.items[0]!.label, 'Check belts')
    assert.isTrue(result.items[0]!.isDone)
    assert.equal(result.items[0]!.position, 2)
  })

  test('notes null stays null', ({ assert }) => {
    const sheet = makeSheet({ notes: null })
    const result = toMaintenanceSheet(sheet)
    assert.isNull(result.notes)
  })

  test('updatedAt null returns null', ({ assert }) => {
    const sheet = makeSheet({ updatedAt: null })
    const result = toMaintenanceSheet(sheet)
    assert.isNull(result.updatedAt)
  })
})
