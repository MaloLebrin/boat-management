import { test } from '@japa/runner'
import {
  buildUnavailabilityWindows,
  taskUnavailabilityDays,
  windowOverlaps,
} from '#shared/helpers/boat_availability'

const EMPTY = { status: 'available' as const, statusChangedAt: null, tasks: [], incidents: [] }

test.group('boat availability windows (#870)', () => {
  test('an available boat without task nor incident has no window', ({ assert }) => {
    assert.deepEqual(buildUnavailabilityWindows(EMPTY), [])
  })

  test('an immobilizing status opens a window from its change date', ({ assert }) => {
    for (const status of ['in_maintenance', 'out_of_service', 'sold'] as const) {
      const [window] = buildUnavailabilityWindows({
        ...EMPTY,
        status,
        statusChangedAt: '2026-10-03T08:00:00.000Z',
      })
      assert.deepEqual(window, {
        source: 'status',
        startsAt: '2026-10-03T08:00:00.000Z',
        endsAt: null,
        label: status,
        refId: null,
      })
    }
  })

  test('a dated task lasts one day by default, or its planned duration rounded up', ({
    assert,
  }) => {
    assert.equal(taskUnavailabilityDays(null), 1)
    assert.equal(taskUnavailabilityDays(0), 1)
    assert.equal(taskUnavailabilityDays(120), 1)
    assert.equal(taskUnavailabilityDays(1440), 1)
    assert.equal(taskUnavailabilityDays(1441), 2)

    const [window] = buildUnavailabilityWindows({
      ...EMPTY,
      tasks: [{ id: 7, title: 'Carénage', dueAt: '2026-10-12', estimatedDurationMinutes: 2880 }],
    })
    assert.deepEqual(window, {
      source: 'task',
      startsAt: '2026-10-12T00:00:00.000Z',
      endsAt: '2026-10-14T00:00:00.000Z',
      label: 'Carénage',
      refId: 7,
    })
  })

  test('an open incident opens a window from its occurrence', ({ assert }) => {
    const [window] = buildUnavailabilityWindows({
      ...EMPTY,
      incidents: [{ id: 3, type: 'engine_failure', occurredAt: '2026-10-01T15:00:00.000Z' }],
    })
    assert.equal(window.source, 'incident')
    assert.isNull(window.endsAt)
    assert.equal(window.label, 'engine_failure')
  })

  test('windows are sorted by start date', ({ assert }) => {
    const windows = buildUnavailabilityWindows({
      status: 'out_of_service',
      statusChangedAt: '2026-10-05T00:00:00.000Z',
      tasks: [{ id: 1, title: 'A', dueAt: '2026-10-20', estimatedDurationMinutes: null }],
      incidents: [{ id: 2, type: 'fire', occurredAt: '2026-10-01T00:00:00.000Z' }],
    })
    assert.deepEqual(
      windows.map((w) => w.source),
      ['incident', 'status', 'task']
    )
  })

  test('overlap treats open bounds as infinite and end bounds as exclusive', ({ assert }) => {
    const task = {
      source: 'task' as const,
      startsAt: '2026-10-12T00:00:00.000Z',
      endsAt: '2026-10-13T00:00:00.000Z',
      label: 'x',
      refId: 1,
    }
    assert.isTrue(windowOverlaps(task, '2026-10-11T10:00:00.000Z', '2026-10-12T09:00:00.000Z'))
    assert.isFalse(windowOverlaps(task, '2026-10-13T00:00:00.000Z', '2026-10-15T00:00:00.000Z'))
    assert.isFalse(windowOverlaps(task, '2026-10-10T00:00:00.000Z', '2026-10-12T00:00:00.000Z'))

    const open = { ...task, source: 'status' as const, endsAt: null }
    assert.isTrue(windowOverlaps(open, '2030-01-01T00:00:00.000Z', '2030-01-02T00:00:00.000Z'))
    assert.isFalse(windowOverlaps(open, '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'))
  })
})
