import OwnerRequestChanged from '#events/owner_request_changed'
import {
  OwnerApprovalNotPendingError,
  OwnerTaskNotFoundError,
} from '#exceptions/owner_portal_errors'
import type Boat from '#models/boat'
import BoatBudgetEntry from '#models/boat_budget_entry'
import BoatDocument from '#models/boat_document'
import BoatIncident from '#models/boat_incident'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Invoice from '#models/invoice'
import NavigationLog from '#models/navigation_log'
import type User from '#models/user'
import AuditLogService from '#services/audit_log_service'
import { OWNER_UPCOMING_LIMIT, OWNER_UPCOMING_WINDOW_DAYS } from '#shared/constants/owner_portal'
import type {
  CreateOwnerRequestPayload,
  OwnerApprovalDecision,
  OwnerDashboard,
  OwnerExpenseCategoryTotal,
  OwnerUpcomingDeadline,
} from '#shared/types/owner_portal'
import { toOwnerTripRow } from '#transformers/boat_owner_transformer'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

/** Sorties du journal montrées au propriétaire, les plus récentes. */
const TRIP_LIMIT = 20
/** Demandes et devis montrés, les plus récents. */
const TASK_LIMIT = 50

/**
 * Portail propriétaire interactif (#890). Toutes les méthodes reçoivent un
 * bateau **déjà résolu par le pivot `boat_owners`** (`BoatOwnerService.getOwnedBoat`) :
 * ce service ne décide pas de l'accès, il borne ce qu'on lit et écrit sur ce
 * bateau-là.
 */
@inject()
export default class OwnerPortalService {
  constructor(private auditLogService: AuditLogService) {}

  async listDocuments(boat: Boat): Promise<BoatDocument[]> {
    return BoatDocument.query()
      .where('boatId', boat.id)
      .orderByRaw('expires_at asc nulls last')
      .orderBy('id', 'asc')
  }

  /** Seules les dépenses que le gestionnaire a partagées (`visible_to_owner`). */
  async listExpenses(boat: Boat): Promise<BoatBudgetEntry[]> {
    return BoatBudgetEntry.query()
      .where('boat_id', boat.id)
      .where('visible_to_owner', true)
      .orderBy('date', 'desc')
  }

  async listIncidents(boat: Boat): Promise<BoatIncident[]> {
    return BoatIncident.query().where('boatId', boat.id).orderBy('occurredAt', 'desc')
  }

  async listTrips(boat: Boat): Promise<NavigationLog[]> {
    return NavigationLog.query()
      .where('boatId', boat.id)
      .where('status', 'completed')
      .orderBy('departedAt', 'desc')
      .limit(TRIP_LIMIT)
  }

  /** Ses demandes, et les devis soumis à son accord. */
  async listTasks(boat: Boat): Promise<BoatMaintenanceTask[]> {
    return BoatMaintenanceTask.query()
      .where('boatId', boat.id)
      .where((query) => {
        query.whereNotNull('requestedByOwnerId').orWhereNotNull('ownerApprovalStatus')
      })
      .orderBy('createdAt', 'desc')
      .limit(TASK_LIMIT)
  }

  /**
   * Factures adressées au propriétaire : celles dont le client CRM porte son
   * e-mail, dans l'organisation du bateau. Un brouillon ne lui est pas encore
   * envoyé, il ne le voit pas.
   */
  async listInvoicesAddressedTo(user: User, boat: Boat): Promise<Invoice[]> {
    return Invoice.query()
      .where('organizationId', boat.organizationId)
      .where('kind', 'invoice')
      .whereNot('status', 'draft')
      .whereHas('client', (query) =>
        query.whereRaw('lower(email) = ?', [user.email.trim().toLowerCase()])
      )
      .orderBy('issuedAt', 'desc')
  }

  async dashboard(boat: Boat, expenses: BoatBudgetEntry[], documents: BoatDocument[]) {
    const today = DateTime.now().startOf('day')
    const yearAgo = today.minus({ months: 12 })
    const horizon = today.plus({ days: OWNER_UPCOMING_WINDOW_DAYS })

    const recent = expenses.filter((entry) => entry.date >= yearAgo)
    const byCategory = new Map<OwnerExpenseCategoryTotal['category'], number>()
    for (const entry of recent) {
      const category = entry.category as OwnerExpenseCategoryTotal['category']
      byCategory.set(category, (byCategory.get(category) ?? 0) + Number.parseFloat(entry.amount))
    }

    const [dueTasks, lastTrip, pending] = await Promise.all([
      BoatMaintenanceTask.query()
        .where('boatId', boat.id)
        .where('status', 'open')
        .whereNotNull('dueAt')
        .where('dueAt', '<=', horizon.toISODate()!)
        .orderBy('dueAt', 'asc')
        .limit(OWNER_UPCOMING_LIMIT),
      NavigationLog.query()
        .where('boatId', boat.id)
        .where('status', 'completed')
        .orderBy('departedAt', 'desc')
        .first(),
      BoatMaintenanceTask.query()
        .where('boatId', boat.id)
        .where('status', 'open')
        .where('ownerApprovalStatus', 'pending')
        .count('* as total')
        .first(),
    ])

    const deadlines: OwnerUpcomingDeadline[] = [
      ...documents
        .filter((doc) => doc.expiresAt && doc.expiresAt <= horizon)
        .map((doc) => ({
          kind: 'document' as const,
          id: doc.id,
          label: doc.customTypeLabel ?? '',
          documentType: doc.type,
          date: doc.expiresAt!.toISODate()!,
        })),
      ...dueTasks.map((task) => ({
        kind: 'task' as const,
        id: task.id,
        label: task.title,
        documentType: null,
        date: task.dueAt!.toISODate()!,
      })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, OWNER_UPCOMING_LIMIT)

    const result: OwnerDashboard = {
      totalCost12Months: round2(recent.reduce((sum, e) => sum + Number.parseFloat(e.amount), 0)),
      costByCategory: [...byCategory.entries()]
        .map(([category, total]) => ({ category, total: round2(total) }))
        .sort((a, b) => b.total - a.total),
      upcomingDeadlines: deadlines,
      lastTrip: lastTrip ? toOwnerTripRow(lastTrip) : null,
      status: boat.status,
      pendingApprovals: Number(pending?.$extras.total ?? 0),
    }
    return result
  }

  /**
   * Demande du propriétaire (« pouvez-vous vérifier le guindeau ? ») : une
   * tâche ouverte, sans échéance ni responsable, que l'équipe planifie. Elle
   * est tracée dans le journal d'audit et notifiée à l'équipe.
   */
  async createRequest(user: User, boat: Boat, payload: CreateOwnerRequestPayload) {
    const description = payload.description?.trim() || null
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      subject: 'boat',
      title: payload.title.trim(),
      notes: description,
      status: 'open',
      requestedByOwnerId: user.id,
    })

    await this.auditLogService.log({
      organizationId: boat.organizationId,
      userId: user.id,
      action: 'maintenance_task.owner_request',
      entityType: 'maintenance_task',
      entityId: task.id,
      metadata: { name: task.title, boatName: boat.name },
    })
    await OwnerRequestChanged.dispatch(
      boat.organizationId,
      { id: boat.id, name: boat.name },
      { id: task.id, title: task.title },
      'request_created',
      { id: user.id, name: user.fullName || user.email }
    )
    return task
  }

  /** Accepte ou refuse un devis en attente, tracé dans le journal d'audit. */
  async decide(user: User, boat: Boat, taskId: number, decision: OwnerApprovalDecision) {
    const task = await BoatMaintenanceTask.query()
      .where('id', taskId)
      .where('boatId', boat.id)
      .whereNotNull('ownerApprovalStatus')
      .first()
    if (!task) throw new OwnerTaskNotFoundError()
    if (task.ownerApprovalStatus !== 'pending' || task.status === 'done') {
      throw new OwnerApprovalNotPendingError()
    }

    const status = decision === 'approve' ? 'approved' : 'rejected'
    task.ownerApprovalStatus = status
    task.ownerApprovalDecidedAt = DateTime.now()
    task.ownerApprovalDecidedBy = user.id
    await task.save()

    await this.auditLogService.log({
      organizationId: boat.organizationId,
      userId: user.id,
      action:
        decision === 'approve' ? 'maintenance_task.owner_approve' : 'maintenance_task.owner_reject',
      entityType: 'maintenance_task',
      entityId: task.id,
      metadata: { name: task.title, boatName: boat.name, estimatedCost: task.estimatedCost },
    })
    await OwnerRequestChanged.dispatch(
      boat.organizationId,
      { id: boat.id, name: boat.name },
      { id: task.id, title: task.title },
      'approval_decided',
      { id: user.id, name: user.fullName || user.email },
      status
    )
    return task
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
