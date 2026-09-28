import { describe, expect, test } from 'vitest'
import {
  addOneMonth,
  columnForDueAt,
  dueAtForColumn,
  endOfWeek,
  reservationConflictFor,
  reservationCoversDay,
  taskOccupiedDays,
} from '../../shared/helpers/planning_schedule'
import { applyDueAtOverrides } from '../../inertia/utils/planning_columns'
import type { PlanningReservation, PlanningTask } from '../../shared/types/planning'

function reservation(overrides: Partial<PlanningReservation> = {}): PlanningReservation {
  return {
    id: 1,
    boatId: 1,
    boatName: 'Sun Odyssey 35',
    status: 'confirmed',
    startsAt: '2026-10-10T08:00:00.000Z',
    endsAt: '2026-10-13T18:00:00.000Z',
    clientName: 'Durand',
    ...overrides,
  }
}

function task(id: number, overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id,
    boatId: 1,
    boatName: 'Sun Odyssey 35',
    title: `Tâche ${id}`,
    subject: 'engine',
    kind: 'date',
    dueAt: '2026-10-01',
    dueEngineHours: null,
    currentEngineHours: null,
    status: 'open',
    postponedCount: 0,
    assignee: null,
    providerName: null,
    estimatedCost: null,
    actualCost: null,
    estimatedDurationMinutes: null,
    actualDurationMinutes: null,
    ...overrides,
  }
}

describe('dueAtForColumn (#869)', () => {
  test('« Bientôt » vise le dimanche de la semaine en cours', () => {
    // 2026-09-28 est un lundi.
    expect(dueAtForColumn('soon', '2026-09-28')).toBe('2026-10-04')
    expect(endOfWeek('2026-10-04')).toBe('2026-10-04')
  })

  test('« Planifiées » vise un mois plus tard, toujours au-delà du seuil « bientôt »', () => {
    expect(dueAtForColumn('planned', '2026-09-28')).toBe('2026-10-29')
    // Février ne fait que 28 jours : +1 mois retomberait en « Bientôt ».
    expect(addOneMonth('2027-02-01')).toBe('2027-03-01')
    expect(dueAtForColumn('planned', '2027-02-01')).toBe('2027-03-04')
    expect(columnForDueAt(dueAtForColumn('planned', '2027-02-01'), '2027-02-01')).toBe('planned')
  })

  test('« Non datées » retire l’échéance', () => {
    expect(dueAtForColumn('undated', '2026-09-28')).toBeNull()
  })

  test('chaque cible retombe dans sa colonne une fois rangée', () => {
    for (const column of ['soon', 'planned', 'undated'] as const) {
      expect(columnForDueAt(dueAtForColumn(column, '2026-12-31'), '2026-12-31')).toBe(column)
    }
  })
})

describe('reservationConflictFor (#869)', () => {
  test('une tâche pendant une réservation confirmée du même bateau est en conflit', () => {
    expect(reservationConflictFor(task(1, { dueAt: '2026-10-11' }), [reservation()])?.id).toBe(1)
  })

  test('ni une option, ni un autre bateau, ni un autre jour ne comptent', () => {
    const due = task(1, { dueAt: '2026-10-11' })
    expect(reservationConflictFor(due, [reservation({ status: 'option' })])).toBeNull()
    expect(reservationConflictFor(due, [reservation({ boatId: 2 })])).toBeNull()
    expect(reservationConflictFor(task(1, { dueAt: '2026-10-14' }), [reservation()])).toBeNull()
    expect(reservationConflictFor(task(1, { dueAt: null }), [reservation()])).toBeNull()
  })

  test('la durée prévue de la tâche étend la plage testée', () => {
    const longTask = task(1, { dueAt: '2026-10-08', estimatedDurationMinutes: 3 * 24 * 60 })
    expect(reservationConflictFor(longTask, [reservation()])).not.toBeNull()
    expect(reservationConflictFor(task(1, { dueAt: '2026-10-08' }), [reservation()])).toBeNull()
  })

  test('taskOccupiedDays et reservationCoversDay', () => {
    expect(taskOccupiedDays('2026-10-08', 36 * 60)).toEqual({
      startsOn: '2026-10-08',
      endsOn: '2026-10-10',
    })
    expect(reservationCoversDay(reservation(), '2026-10-10')).toBe(true)
    expect(reservationCoversDay(reservation(), '2026-10-13')).toBe(true)
    expect(reservationCoversDay(reservation(), '2026-10-14')).toBe(false)
  })
})

describe('applyDueAtOverrides (#869, rendu optimiste)', () => {
  const columns = {
    overdueTasks: [task(1, { dueAt: '2026-09-01' })],
    soonTasks: [task(2, { dueAt: '2026-10-01' })],
    plannedTasks: [task(3, { dueAt: '2026-12-01' })],
    undatedTasks: [task(4, { dueAt: null })],
  }

  test('sans déplacement en cours, les colonnes serveur sont rendues telles quelles', () => {
    expect(applyDueAtOverrides(columns, new Map(), '2026-09-28')).toBe(columns)
  })

  test('une tâche déplacée rejoint la colonne de sa nouvelle échéance', () => {
    const result = applyDueAtOverrides(
      columns,
      new Map<number, string | null>([
        [1, '2026-12-15'],
        [3, null],
      ]),
      '2026-09-28'
    )
    expect(result.overdueTasks).toEqual([])
    expect(result.plannedTasks.map((t) => [t.id, t.dueAt])).toEqual([[1, '2026-12-15']])
    expect(result.undatedTasks.map((t) => t.id)).toEqual([4, 3])
    expect(result.soonTasks.map((t) => t.id)).toEqual([2])
  })
})
