import type BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import type BoatMaintenanceTask from '#models/boat_maintenance_task'

export function toMaintenanceTask(t: BoatMaintenanceTask) {
  return {
    id: t.id,
    boatId: t.boatId,
    subject: t.subject,
    title: t.title,
    notes: t.notes,
    status: t.status as 'open' | 'done',
    dueAt: t.dueAt ? t.dueAt.toISODate() : null,
    dueEngineHours: t.dueEngineHours,
    doneAt: t.doneAt ? t.doneAt.toISODate() : null,
    doneEngineHours: t.doneEngineHours,
    lastDoneEngineHours: t.lastDoneEngineHours,
    boatEngineId: t.boatEngineId,
    boatSailId: t.boatSailId,
    boatRigId: t.boatRigId,
    recurrenceIntervalMonths: t.recurrenceIntervalMonths,
    recurrenceIntervalEngineHours: t.recurrenceIntervalEngineHours,
    createdAt: t.createdAt.toISO(),
    updatedAt: t.updatedAt?.toISO() ?? null,
  }
}

export function toMaintenanceSheet(s: BoatMaintenanceSheet) {
  return {
    id: s.id,
    boatId: s.boatId,
    type: s.type as 'entretien' | 'montage' | 'hivernage' | 'dehivernage' | 'atelier',
    title: s.title,
    status: s.status as 'in_progress' | 'completed',
    performedAt: s.performedAt.toISODate(),
    notes: s.notes,
    items: (s.items ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      isDone: item.isDone,
      notes: item.notes,
      position: item.position,
    })),
    createdAt: s.createdAt.toISO(),
    updatedAt: s.updatedAt?.toISO() ?? null,
  }
}
