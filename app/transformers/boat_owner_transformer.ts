import type BoatBudgetEntry from '#models/boat_budget_entry'
import type BoatDocument from '#models/boat_document'
import type BoatIncident from '#models/boat_incident'
import type BoatMaintenanceTask from '#models/boat_maintenance_task'
import type NavigationLog from '#models/navigation_log'
import { ownerRequestStatusOf } from '#shared/constants/owner_portal'
import { decimalColumnToNumber } from '#shared/helpers/number_format'
import type { BoatDocumentType } from '#shared/types/boat_document'
import type { IncidentStatus, IncidentType } from '#shared/types/incident'
import type {
  OwnerApprovalStatus,
  OwnerDocumentRow,
  OwnerExpenseRow,
  OwnerIncidentRow,
  OwnerTaskRow,
  OwnerTripRow,
} from '#shared/types/owner_portal'

/**
 * Ce que le propriétaire voit de son bateau (#890). Une liste de champs
 * **explicite** par entité, comme `toBoatOwnerMaintenanceEvent` (#781) : une
 * colonne ajoutée demain à ces tables ne part pas chez lui tant qu'on ne
 * l'ajoute pas ici. Sont volontairement absents : coût et fichier d'un
 * document, description interne d'une dépense, description et auteur d'un
 * incident, équipage et notes d'une sortie, notes, responsable et coût réel
 * d'une tâche.
 */

export function toOwnerDocumentRow(document: BoatDocument): OwnerDocumentRow {
  return {
    id: document.id,
    type: document.type as BoatDocumentType,
    customTypeLabel: document.customTypeLabel,
    referenceNumber: document.referenceNumber,
    issuer: document.issuer,
    issuedAt: document.issuedAt?.toISODate() ?? null,
    expiresAt: document.expiresAt?.toISODate() ?? null,
  }
}

export function toOwnerExpenseRow(entry: BoatBudgetEntry): OwnerExpenseRow {
  return {
    id: entry.id,
    date: entry.date.toISODate() ?? '',
    label: entry.label,
    category: entry.category as OwnerExpenseRow['category'],
    amount: Number.parseFloat(entry.amount),
  }
}

export function toOwnerIncidentRow(incident: BoatIncident): OwnerIncidentRow {
  return {
    id: incident.id,
    type: incident.type as IncidentType,
    status: incident.status as IncidentStatus,
    occurredAt: incident.occurredAt.toISO() ?? '',
    closedAt: incident.closedAt?.toISO() ?? null,
  }
}

export function toOwnerTripRow(log: NavigationLog): OwnerTripRow {
  const start = decimalColumnToNumber(log.engineHoursStart)
  const end = decimalColumnToNumber(log.engineHoursEnd)
  return {
    id: log.id,
    departedAt: log.departedAt.toISO() ?? '',
    arrivedAt: log.arrivedAt?.toISO() ?? null,
    departurePortName: log.departurePortName,
    arrivalPortName: log.arrivalPortName,
    distanceNm: decimalColumnToNumber(log.distanceNm),
    engineHours: start !== null && end !== null && end >= start ? end - start : null,
  }
}

/**
 * Une demande du propriétaire ou un devis soumis à son accord. La description
 * n'est renvoyée que pour ses propres demandes : sur une tâche créée par
 * l'équipe, `notes` est un champ interne.
 */
export function toOwnerTaskRow(task: BoatMaintenanceTask): OwnerTaskRow {
  const requestedByOwner = task.requestedByOwnerId !== null
  return {
    id: task.id,
    title: task.title,
    description: requestedByOwner ? task.notes : null,
    status: ownerRequestStatusOf(task),
    requestedByOwner,
    dueAt: task.dueAt?.toISODate() ?? null,
    doneAt: task.doneAt?.toISODate() ?? null,
    estimatedCost: decimalColumnToNumber(task.estimatedCost),
    approval: (task.ownerApprovalStatus as OwnerApprovalStatus | null) ?? null,
    createdAt: task.createdAt.toISO() ?? '',
  }
}
