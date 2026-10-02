import type { BoatDocumentType } from './boat_document.js'
import type { BudgetEntryCategory } from './budget.js'
import type { IncidentStatus, IncidentType } from './incident.js'

/**
 * Portail propriétaire interactif (#890). Chaque forme ci-dessous est la
 * **totalité** de ce que le propriétaire reçoit d'une entité : les
 * transformers de `boat_owner_transformer` n'en recopient pas une colonne de
 * plus, et `tests/functional/owner/owner_portal_props.spec.ts` fige leurs clés.
 */

/** Ce que voit le propriétaire d'une demande : reçue, planifiée, faite. */
export type OwnerRequestStatus = 'received' | 'planned' | 'done'

/** Accord du propriétaire sur un devis au-dessus du seuil. */
export type OwnerApprovalStatus = 'pending' | 'approved' | 'rejected'

export type OwnerApprovalDecision = 'approve' | 'reject'

export interface OwnerDocumentRow {
  id: number
  type: BoatDocumentType
  customTypeLabel: string | null
  referenceNumber: string | null
  issuer: string | null
  issuedAt: string | null
  expiresAt: string | null
}

/** Dépense partagée par le gestionnaire (`visible_to_owner`), sans notes internes. */
export interface OwnerExpenseRow {
  id: number
  date: string
  label: string
  category: BudgetEntryCategory | 'other'
  amount: number
}

export interface OwnerIncidentRow {
  id: number
  type: IncidentType
  status: IncidentStatus
  occurredAt: string
  closedAt: string | null
}

/** Sortie du journal de bord, sans équipage, notes ni données des locataires. */
export interface OwnerTripRow {
  id: number
  departedAt: string
  arrivedAt: string | null
  departurePortName: string | null
  arrivalPortName: string | null
  distanceNm: number | null
  engineHours: number | null
}

/** Demande du propriétaire, ou devis soumis à son accord. */
export interface OwnerTaskRow {
  id: number
  title: string
  description: string | null
  status: OwnerRequestStatus
  requestedByOwner: boolean
  dueAt: string | null
  doneAt: string | null
  estimatedCost: number | null
  approval: OwnerApprovalStatus | null
  createdAt: string
}

export interface OwnerUpcomingDeadline {
  kind: 'document' | 'task'
  id: number
  /** Titre de la tâche, ou libellé libre d'un document (`''` pour un type connu). */
  label: string
  /** Type du document, à traduire côté écran ; `null` pour une tâche. */
  documentType: BoatDocumentType | null
  date: string
}

export interface OwnerExpenseCategoryTotal {
  category: BudgetEntryCategory | 'other'
  total: number
}

export interface OwnerDashboard {
  /** Somme des dépenses partagées sur les 12 derniers mois. */
  totalCost12Months: number
  costByCategory: OwnerExpenseCategoryTotal[]
  upcomingDeadlines: OwnerUpcomingDeadline[]
  lastTrip: OwnerTripRow | null
  status: string
  pendingApprovals: number
}

export interface CreateOwnerRequestPayload {
  title: string
  description?: string | null
}
