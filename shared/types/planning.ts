import type { MaintenanceTaskWorkOrder } from '#shared/types/maintenance'

/** Tâche du planning, avec son ordre de travail (#868). */
export interface PlanningTask extends MaintenanceTaskWorkOrder {
  id: number
  boatId: number
  boatName: string
  title: string
  subject: string
  kind: 'date' | 'hours'
  dueAt: string | null
  dueEngineHours: number | null
  currentEngineHours: number | null
  status: 'open' | 'done'
  /** Nombre de reports de l'échéance (#867). */
  postponedCount: number
}

export interface MaintenanceHistoryEvent {
  id: number
  boatId: number
  boatName: string
  subject: string
  title: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  sailCaption: string | null
  boatEngineId: number | null
  boatSailId: number | null
  boatRigId: number | null
  parts: Array<{ id: number; name: string; quantity: number | null }>
}

export interface MaintenanceHistoryStats {
  totalEvents: number
  totalParts: number
  totalBoats: number
}

export interface TaskGroup {
  id: string
  subject: string
  boatId: number
  boatName: string
  tasks: PlanningTask[]
  earliestDueAt: string
  latestDueAt: string
}

export interface PlanningResult {
  tasks: PlanningTask[]
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
  undatedTasks: PlanningTask[]
  doneTasks: PlanningTask[]
  doneTasksTotal: number
  /**
   * Nombre de tâches terminées par assigné (clé : id du membre en chaîne, ou
   * `'unassigned'`), pour que le filtre « Assigné à » affiche le vrai total
   * et non la taille de la liste tronquée (#868).
   */
  doneTasksTotalByAssignee: Record<string, number>
  groups: TaskGroup[]
  canGroupTasks: boolean
  /**
   * Réservations `option`/`confirmed` de la flotte, rendues en bandes
   * d'indisponibilité sous les tâches (#869). Vide quand le module Location
   * est inactif ou que l'appelant ne voit pas les bateaux.
   */
  reservations: PlanningReservation[]
}

/** Réservation superposée au planning (#869) — lecture seule. */
export interface PlanningReservation {
  id: number
  boatId: number
  boatName: string
  status: 'option' | 'confirmed'
  /** Instants ISO — fin exclusive. */
  startsAt: string
  endsAt: string
  clientName: string
}

/** Colonnes du kanban sur lesquelles une carte peut être déposée (#869). */
export const PLANNING_DROP_COLUMNS = ['soon', 'planned', 'undated'] as const
export type PlanningDropColumn = (typeof PLANNING_DROP_COLUMNS)[number]

/**
 * Seuil « bientôt due » en jours : même borne que le classement serveur
 * (`PlanningService`). Une tâche déposée en « Planifiées » doit tomber au-delà.
 */
export const PLANNING_SOON_DAYS = 30

/**
 * Fenêtre des réservations chargées pour le planning, autour d'aujourd'hui :
 * le calendrier se navigue au mois, un an devant suffit.
 */
export const PLANNING_RESERVATIONS_PAST_DAYS = 31
export const PLANNING_RESERVATIONS_FUTURE_DAYS = 366

/**
 * Tâches terminées envoyées au planning : les N plus récentes de la flotte,
 * **et** les N plus récentes de chaque assigné — le filtre « Assigné à »
 * reste ainsi rempli même quand le membre n'est pas dans le top de la flotte.
 */
export const PLANNING_DONE_TASKS_LIMIT = 20
