import { describe, expect, test } from 'vitest'
import { postponedDueDate } from '../../inertia/utils/task_postpone'

describe('postponedDueDate (#867)', () => {
  test('adds a week or a month to a future due date', () => {
    expect(postponedDueDate('2026-10-01', 'week', '2026-09-27')).toBe('2026-10-08')
    expect(postponedDueDate('2026-10-01', 'month', '2026-09-27')).toBe('2026-11-01')
  })

  test('starts from today when the task is already overdue', () => {
    expect(postponedDueDate('2026-08-01', 'week', '2026-09-27')).toBe('2026-10-04')
    expect(postponedDueDate('2026-08-01', 'month', '2026-09-27')).toBe('2026-10-27')
  })

  test('crosses month and year boundaries', () => {
    expect(postponedDueDate('2026-12-28', 'week', '2026-09-27')).toBe('2027-01-04')
    expect(postponedDueDate('2026-12-15', 'month', '2026-09-27')).toBe('2027-01-15')
  })

  test('clamps a month postponement to the end of a shorter month', () => {
    expect(postponedDueDate('2027-01-31', 'month', '2026-09-27')).toBe('2027-02-28')
    expect(postponedDueDate('2028-01-31', 'month', '2026-09-27')).toBe('2028-02-29')
  })
})
