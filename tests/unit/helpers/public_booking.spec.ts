import { test } from '@japa/runner'
import {
  canPickDay,
  isDayBusy,
  isDayString,
  mergeBusyRanges,
  nextDraft,
  selectionOverlapsBusy,
} from '#shared/helpers/public_booking'

/** Helpers de la page publique de réservation (#881). */

const WINDOW = { from: '2031-07-03', until: '2032-07-02' }
const BUSY = [{ startsOn: '2031-07-10', endsOn: '2031-07-14' }]

test.group('public booking — busy ranges', () => {
  test('merges overlapping and touching ranges, drops empty ones', ({ assert }) => {
    assert.deepEqual(
      mergeBusyRanges([
        { startsOn: '2031-07-20', endsOn: '2031-07-22' },
        { startsOn: '2031-07-05', endsOn: '2031-07-07' },
        { startsOn: '2031-07-07', endsOn: '2031-07-09' },
        { startsOn: '2031-07-06', endsOn: '2031-07-08' },
        { startsOn: '2031-07-30', endsOn: '2031-07-30' },
      ]),
      [
        { startsOn: '2031-07-05', endsOn: '2031-07-09' },
        { startsOn: '2031-07-20', endsOn: '2031-07-22' },
      ]
    )
  })

  test('the end day of a range is free', ({ assert }) => {
    assert.isTrue(isDayBusy('2031-07-10', BUSY))
    assert.isTrue(isDayBusy('2031-07-13', BUSY))
    assert.isFalse(isDayBusy('2031-07-14', BUSY))
  })

  test('a stay may end the day a busy range starts, and start the day it ends', ({ assert }) => {
    assert.isFalse(selectionOverlapsBusy({ startsOn: '2031-07-07', endsOn: '2031-07-10' }, BUSY))
    assert.isFalse(selectionOverlapsBusy({ startsOn: '2031-07-14', endsOn: '2031-07-16' }, BUSY))
    assert.isTrue(selectionOverlapsBusy({ startsOn: '2031-07-07', endsOn: '2031-07-11' }, BUSY))
  })

  test('isDayString accepts real calendar days only', ({ assert }) => {
    assert.isTrue(isDayString('2031-07-03'))
    assert.isFalse(isDayString('2031-02-30'))
    assert.isFalse(isDayString('2031-7-3'))
    assert.isFalse(isDayString(20310703))
  })
})

test.group('public booking — calendar selection', () => {
  test('an arrival must be a free day inside the window', ({ assert }) => {
    assert.isTrue(canPickDay('2031-07-05', null, BUSY, WINDOW))
    assert.isFalse(canPickDay('2031-07-02', null, BUSY, WINDOW))
    assert.isFalse(canPickDay('2031-07-11', null, BUSY, WINDOW))
    // Le dernier jour de la fenêtre ne laisse aucun départ possible.
    assert.isFalse(canPickDay('2032-07-02', null, BUSY, WINDOW))
  })

  test('a departure may land on a busy day, never beyond it', ({ assert }) => {
    const draft = { startsOn: '2031-07-06', endsOn: null }
    assert.isTrue(canPickDay('2031-07-10', draft, BUSY, WINDOW))
    assert.isFalse(canPickDay('2031-07-12', draft, BUSY, WINDOW))
    assert.isTrue(canPickDay('2031-07-20', draft, BUSY, WINDOW))
  })

  test('first click sets the arrival, second the departure, a third restarts', ({ assert }) => {
    const first = nextDraft('2031-07-04', null, BUSY)
    assert.deepEqual(first, { startsOn: '2031-07-04', endsOn: null })
    const second = nextDraft('2031-07-08', first, BUSY)
    assert.deepEqual(second, { startsOn: '2031-07-04', endsOn: '2031-07-08' })
    assert.deepEqual(nextDraft('2031-07-20', second, BUSY), {
      startsOn: '2031-07-20',
      endsOn: null,
    })
  })

  test('a click before the arrival, or across a busy range, restarts the selection', ({
    assert,
  }) => {
    const draft = { startsOn: '2031-07-06', endsOn: null }
    assert.deepEqual(nextDraft('2031-07-04', draft, BUSY), {
      startsOn: '2031-07-04',
      endsOn: null,
    })
    assert.deepEqual(nextDraft('2031-07-20', draft, BUSY), {
      startsOn: '2031-07-20',
      endsOn: null,
    })
  })
})
