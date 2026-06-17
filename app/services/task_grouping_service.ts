import type { PlanningTask, TaskGroup } from '#shared/types/planning'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

const PROXIMITY_DAYS = 7

@inject()
export default class TaskGroupingService {
  group(tasks: PlanningTask[]): TaskGroup[] {
    const dateTasks = tasks.filter(
      (t) => t.kind === 'date' && t.dueAt !== null && t.status === 'open'
    )

    // Sort by (boatId, subject, dueAt) for greedy sweep
    const sorted = [...dateTasks].sort((a, b) => {
      if (a.boatId !== b.boatId) return a.boatId - b.boatId
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject)
      return a.dueAt!.localeCompare(b.dueAt!)
    })

    const groups: TaskGroup[] = []
    let i = 0

    while (i < sorted.length) {
      const seed = sorted[i]!
      const bucket: PlanningTask[] = [seed]
      let latestDate = DateTime.fromISO(seed.dueAt!)

      let j = i + 1
      while (j < sorted.length) {
        const candidate = sorted[j]!
        if (candidate.boatId !== seed.boatId || candidate.subject !== seed.subject) break

        const candidateDate = DateTime.fromISO(candidate.dueAt!)
        if (candidateDate.diff(latestDate, 'days').days > PROXIMITY_DAYS) break

        bucket.push(candidate)
        latestDate = candidateDate
        j++
      }

      if (bucket.length >= 2) {
        groups.push({
          id: `${seed.boatId}-${seed.subject}-${seed.dueAt}`,
          subject: seed.subject,
          boatId: seed.boatId,
          boatName: seed.boatName,
          tasks: bucket,
          earliestDueAt: bucket[0]!.dueAt!,
          latestDueAt: bucket[bucket.length - 1]!.dueAt!,
        })
      }

      i = j
    }

    return groups
  }
}
