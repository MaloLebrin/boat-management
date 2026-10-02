import type { OwnerRequestStatus } from '../types/owner_portal.js'

/**
 * Seuil (en euros, coût prévu) au-delà duquel une tâche d'un bateau confié
 * attend l'accord de son propriétaire (#890). En dessous, le gestionnaire agit
 * sans demander : c'est l'entretien courant qu'il a mandat de faire.
 */
export const OWNER_APPROVAL_THRESHOLD_EUR = 500

/** Fenêtre des « prochaines échéances » du tableau de bord propriétaire. */
export const OWNER_UPCOMING_WINDOW_DAYS = 90

/** Nombre d'échéances affichées au plus sur le tableau de bord. */
export const OWNER_UPCOMING_LIMIT = 5

/** Longueurs maximales d'une demande, partagées par le validateur et le formulaire. */
export const OWNER_REQUEST_TITLE_MAX = 160
export const OWNER_REQUEST_DESCRIPTION_MAX = 2000

/**
 * Le statut d'une tâche, vu du propriétaire : faite, planifiée (une date ou un
 * responsable), sinon simplement reçue.
 */
export function ownerRequestStatusOf(task: {
  status: string
  dueAt: unknown
  assigneeId: number | null
}): OwnerRequestStatus {
  if (task.status === 'done') return 'done'
  if (task.dueAt || task.assigneeId !== null) return 'planned'
  return 'received'
}

/** Un coût prévu qui demande l'accord du propriétaire. */
export function requiresOwnerApproval(estimatedCost: number | null): boolean {
  return estimatedCost !== null && estimatedCost >= OWNER_APPROVAL_THRESHOLD_EUR
}
