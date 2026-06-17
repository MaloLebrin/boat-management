import { test } from '@japa/runner'
import TaskGroupingService from '#services/task_grouping_service'
import type { PlanningTask } from '#shared/types/planning'

function makeTask(
  overrides: Partial<PlanningTask> & { id: number; dueAt: string | null }
): PlanningTask {
  return {
    id: overrides.id,
    boatId: overrides.boatId ?? 1,
    boatName: overrides.boatName ?? 'Bateau A',
    title: overrides.title ?? `Task ${overrides.id}`,
    subject: overrides.subject ?? 'engine',
    kind: overrides.dueAt ? 'date' : 'hours',
    dueAt: overrides.dueAt,
    dueEngineHours: overrides.dueEngineHours ?? null,
    currentEngineHours: overrides.currentEngineHours ?? null,
    status: overrides.status ?? 'open',
  }
}

test.group('TaskGroupingService', () => {
  const service = new TaskGroupingService()

  test('returns empty array for empty input', ({ assert }) => {
    assert.deepEqual(service.group([]), [])
  })

  test('returns empty array for a single task', ({ assert }) => {
    const tasks = [makeTask({ id: 1, dueAt: '2026-07-01' })]
    assert.deepEqual(service.group(tasks), [])
  })

  test('groups two tasks with same subject within 7 days', ({ assert }) => {
    const tasks = [
      makeTask({ id: 1, subject: 'engine', dueAt: '2026-07-01' }),
      makeTask({ id: 2, subject: 'engine', dueAt: '2026-07-05' }),
    ]
    const groups = service.group(tasks)
    assert.equal(groups.length, 1)
    assert.equal(groups[0]!.tasks.length, 2)
    assert.equal(groups[0]!.subject, 'engine')
    assert.equal(groups[0]!.earliestDueAt, '2026-07-01')
    assert.equal(groups[0]!.latestDueAt, '2026-07-05')
  })

  test('does not group tasks more than 7 days apart', ({ assert }) => {
    const tasks = [
      makeTask({ id: 1, subject: 'engine', dueAt: '2026-07-01' }),
      makeTask({ id: 2, subject: 'engine', dueAt: '2026-07-10' }),
    ]
    assert.deepEqual(service.group(tasks), [])
  })

  test('does not group tasks with different subjects', ({ assert }) => {
    const tasks = [
      makeTask({ id: 1, subject: 'engine', dueAt: '2026-07-01' }),
      makeTask({ id: 2, subject: 'sail', dueAt: '2026-07-02' }),
    ]
    assert.deepEqual(service.group(tasks), [])
  })

  test('does not group tasks on different boats', ({ assert }) => {
    const tasks = [
      makeTask({ id: 1, boatId: 1, subject: 'engine', dueAt: '2026-07-01' }),
      makeTask({ id: 2, boatId: 2, subject: 'engine', dueAt: '2026-07-02' }),
    ]
    assert.deepEqual(service.group(tasks), [])
  })

  test('does not group hour-based tasks', ({ assert }) => {
    const tasks = [
      makeTask({ id: 1, dueAt: null, dueEngineHours: 100, currentEngineHours: 80 }),
      makeTask({ id: 2, dueAt: null, dueEngineHours: 200, currentEngineHours: 180 }),
    ]
    assert.deepEqual(service.group(tasks), [])
  })

  // No test for done tasks: the service does not filter by status.
  // Callers (PlanningService) are responsible for passing only plannedTasks (open).

  test('groups exactly 7 days apart (boundary)', ({ assert }) => {
    const tasks = [
      makeTask({ id: 1, subject: 'sail', dueAt: '2026-07-01' }),
      makeTask({ id: 2, subject: 'sail', dueAt: '2026-07-08' }),
    ]
    const groups = service.group(tasks)
    assert.equal(groups.length, 1)
    assert.equal(groups[0]!.tasks.length, 2)
  })

  test('produces two independent groups when subject differs', ({ assert }) => {
    const tasks = [
      makeTask({ id: 1, subject: 'engine', dueAt: '2026-07-01' }),
      makeTask({ id: 2, subject: 'engine', dueAt: '2026-07-03' }),
      makeTask({ id: 3, subject: 'hull', dueAt: '2026-07-01' }),
      makeTask({ id: 4, subject: 'hull', dueAt: '2026-07-04' }),
    ]
    const groups = service.group(tasks)
    assert.equal(groups.length, 2)
  })

  test('does not transitively group A=j1 B=j5 C=j11 (C is 10 days from seed A)', ({ assert }) => {
    // Fixed-seed semantics: each candidate is compared against the seed, not the previous task.
    // A→B: 4 days ≤ 7 → ok. A→C: 10 days > 7 → C is excluded.
    // A+B form a group; C starts a new sweep but has no partner → no second group.
    const tasks = [
      makeTask({ id: 1, subject: 'engine', dueAt: '2026-07-01' }),
      makeTask({ id: 2, subject: 'engine', dueAt: '2026-07-05' }),
      makeTask({ id: 3, subject: 'engine', dueAt: '2026-07-11' }),
    ]
    const groups = service.group(tasks)
    assert.equal(groups.length, 1)
    assert.equal(groups[0]!.tasks.length, 2)
    assert.equal(groups[0]!.latestDueAt, '2026-07-05')
  })

  test('group id includes boatId, subject and earliest date', ({ assert }) => {
    const tasks = [
      makeTask({ id: 1, boatId: 42, subject: 'rig', dueAt: '2026-08-01' }),
      makeTask({ id: 2, boatId: 42, subject: 'rig', dueAt: '2026-08-05' }),
    ]
    const groups = service.group(tasks)
    assert.equal(groups[0]!.id, '42-rig-2026-08-01')
  })
})
