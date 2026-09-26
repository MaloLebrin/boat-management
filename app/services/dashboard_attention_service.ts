import BoatDocument from '#models/boat_document'
import BoatIncident from '#models/boat_incident'
import Invoice from '#models/invoice'
import type User from '#models/user'
import { ATTENTION_DISPLAY_CAP, ATTENTION_FETCH_PER_KIND } from '#shared/constants/dashboard'
import { BOAT_DOCUMENT_EXPIRY_WARNING_DAYS } from '#shared/constants/boats/boat_document_constants'
import { documentStatusFor } from '#shared/helpers/boat_document'
import { isDueDateOverdue } from '#shared/helpers/maintenance'
import type {
  DashboardAttention,
  DashboardAttentionCounts,
  DashboardAttentionDocument,
  DashboardAttentionIncident,
  DashboardAttentionInvoice,
  DashboardAttentionItem,
  DashboardAttentionMaintenance,
  DashboardStats,
  DashboardUrgentMaintenanceRow,
} from '#shared/types/dashboard'
import type { IncidentType } from '#shared/types/incident'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

const SEVERITY_RANK: Record<DashboardAttentionItem['severity'], number> = { danger: 0, warning: 1 }

/**
 * Liste « À traiter » du tableau de bord (#832) : une seule liste mixte
 * (maintenance urgente, incidents ouverts, documents à échéance, factures
 * impayées) triée par sévérité puis par date, pour que l'élément le plus
 * pressant soit en tête quel que soit son type. Les compteurs par type sont
 * exacts ; seules les lignes affichées sont plafonnées.
 */
export default class DashboardAttentionService {
  async getForUser(
    user: User,
    urgentRows: DashboardUrgentMaintenanceRow[],
    stats: DashboardStats,
    opts: { canViewInvoices: boolean; today?: string }
  ): Promise<DashboardAttention> {
    const today = opts.today ?? DateTime.now().toISODate()!
    const orgId = user.organizationId

    const maintenance = urgentRows.map((row) => this.toMaintenanceItem(row, today))
    const maintenanceOverdue = stats.deltas.overdueCount
    const maintenanceSoon = Math.max(stats.urgentMaintenance - maintenanceOverdue, 0)

    if (!orgId) {
      return this.build(
        maintenance,
        {
          maintenanceOverdue,
          maintenanceSoon,
          incidentsOpen: 0,
          documentsExpired: 0,
          documentsExpiring: 0,
          invoicesOverdue: 0,
          total: maintenanceOverdue + maintenanceSoon,
        },
        opts.canViewInvoices
      )
    }

    const [incidents, documents, invoices] = await Promise.all([
      this.fetchIncidents(orgId),
      this.fetchDocuments(orgId, today),
      opts.canViewInvoices
        ? this.fetchInvoices(orgId, today)
        : Promise.resolve({ items: [], total: 0 }),
    ])

    const counts: DashboardAttentionCounts = {
      maintenanceOverdue,
      maintenanceSoon,
      incidentsOpen: incidents.total,
      documentsExpired: documents.expired,
      documentsExpiring: documents.expiring,
      invoicesOverdue: invoices.total,
      total: 0,
    }
    counts.total =
      counts.maintenanceOverdue +
      counts.maintenanceSoon +
      counts.incidentsOpen +
      counts.documentsExpired +
      counts.documentsExpiring +
      counts.invoicesOverdue

    return this.build(
      [...maintenance, ...incidents.items, ...documents.items, ...invoices.items],
      counts,
      opts.canViewInvoices
    )
  }

  private build(
    items: DashboardAttentionItem[],
    counts: DashboardAttentionCounts,
    canViewInvoices: boolean
  ): DashboardAttention {
    const sorted = [...items].sort((a, b) => {
      const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      if (bySeverity !== 0) return bySeverity
      // Date la plus ancienne d'abord ; sans date (tâche en heures) en dernier.
      if (a.date === null && b.date !== null) return 1
      if (a.date !== null && b.date === null) return -1
      if (a.date !== null && b.date !== null && a.date !== b.date) return a.date < b.date ? -1 : 1
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
    })
    return { items: sorted.slice(0, ATTENTION_DISPLAY_CAP), counts, canViewInvoices }
  }

  private toMaintenanceItem(
    row: DashboardUrgentMaintenanceRow,
    today: string
  ): DashboardAttentionMaintenance {
    const overdue = row.kind === 'date' && row.dueAt !== null && isDueDateOverdue(row.dueAt, today)
    return {
      kind: 'maintenance',
      key: `maintenance:${row.id}`,
      severity: overdue ? 'danger' : 'warning',
      boatId: row.boatId,
      boatName: row.boatName,
      date: row.dueAt,
      href: `/planning?task=${row.id}`,
      taskId: row.id,
      title: row.title,
      subject: row.subject,
      due: row.kind === 'hours' ? 'hours' : overdue ? 'overdue' : 'soon',
      dueAt: row.dueAt,
      dueEngineHours: row.dueEngineHours,
      currentEngineHours: row.currentEngineHours,
    }
  }

  /** Incidents ouverts ou en cours, le plus ancien d'abord ; total par fonction fenêtre (une requête). */
  private async fetchIncidents(
    orgId: number
  ): Promise<{ items: DashboardAttentionIncident[]; total: number }> {
    const rows = await BoatIncident.query()
      .where('organizationId', orgId)
      .whereIn('status', ['open', 'in_progress'])
      .preload('boat', (q) => q.select(['id', 'name']))
      .select('*')
      .select(db.raw('count(*) over() as window_total'))
      .orderBy('occurredAt', 'asc')
      .orderBy('id', 'asc')
      .limit(ATTENTION_FETCH_PER_KIND)

    return {
      total: Number(rows[0]?.$extras.window_total ?? 0),
      items: rows.map((incident) => ({
        kind: 'incident',
        key: `incident:${incident.id}`,
        severity: 'warning',
        boatId: incident.boatId,
        boatName: incident.boat?.name ?? `#${incident.boatId}`,
        date: incident.occurredAt.toISODate(),
        href: `/boats/${incident.boatId}/incidents/${incident.id}`,
        incidentId: incident.id,
        incidentType: incident.type as IncidentType,
        status: incident.status as 'open' | 'in_progress',
        occurredAt: incident.occurredAt.toISO()!,
      })),
    }
  }

  /**
   * Documents expirés ou à moins de `BOAT_DOCUMENT_EXPIRY_WARNING_DAYS` jours.
   * Les deux compteurs (expirés / à échéance) viennent d'un agrégat conditionnel
   * séparé : la fonction fenêtre ne saurait pas les distinguer.
   */
  private async fetchDocuments(
    orgId: number,
    today: string
  ): Promise<{ items: DashboardAttentionDocument[]; expired: number; expiring: number }> {
    const horizon = DateTime.fromISO(today)
      .plus({ days: BOAT_DOCUMENT_EXPIRY_WARNING_DAYS })
      .toISODate()!

    const [rows, agg] = await Promise.all([
      BoatDocument.query()
        .where('organizationId', orgId)
        .whereNotNull('expiresAt')
        .where('expiresAt', '<=', horizon)
        .preload('boat', (q) => q.select(['id', 'name']))
        .orderBy('expiresAt', 'asc')
        .orderBy('id', 'asc')
        .limit(ATTENTION_FETCH_PER_KIND),
      db
        .from('boat_documents')
        .where('organization_id', orgId)
        .whereNotNull('expires_at')
        .where('expires_at', '<=', horizon)
        .select(db.raw('count(*)::int as total'))
        .select(db.raw('sum(case when expires_at < ? then 1 else 0 end)::int as expired', [today]))
        .first(),
    ])

    const total = Number(agg?.total ?? 0)
    const expired = Number(agg?.expired ?? 0)

    return {
      expired,
      expiring: Math.max(total - expired, 0),
      items: rows.map((doc) => {
        const expiresAt = doc.expiresAt!.toISODate()!
        const status = documentStatusFor(expiresAt, today)
        return {
          kind: 'document',
          key: `document:${doc.id}`,
          severity: status === 'expired' ? 'danger' : 'warning',
          boatId: doc.boatId,
          boatName: doc.boat?.name ?? `#${doc.boatId}`,
          date: expiresAt,
          href: `/boats/${doc.boatId}?tab=documents`,
          documentId: doc.id,
          documentType: doc.type,
          customTypeLabel: doc.customTypeLabel,
          expiresAt,
          status: status === 'expired' ? 'expired' : 'expiring_soon',
        }
      }),
    }
  }

  /**
   * Factures (pas les devis) impayées, la plus ancienne échéance d'abord :
   * statut `overdue` **ou** envoyée avec une échéance dépassée — le job qui
   * bascule le statut ne passe qu'une fois par jour (06:00), le tableau de
   * bord ne doit pas attendre son passage.
   */
  private async fetchInvoices(
    orgId: number,
    today: string
  ): Promise<{ items: DashboardAttentionInvoice[]; total: number }> {
    const rows = await Invoice.query()
      .where('organizationId', orgId)
      .where('kind', 'invoice')
      .where((q) => {
        q.where('status', 'overdue').orWhere((sent) =>
          sent.where('status', 'sent').where('dueAt', '<', today)
        )
      })
      .select('*')
      .select(db.raw('count(*) over() as window_total'))
      .orderBy('dueAt', 'asc')
      .orderBy('id', 'asc')
      .limit(ATTENTION_FETCH_PER_KIND)

    return {
      total: Number(rows[0]?.$extras.window_total ?? 0),
      items: rows.map((invoice) => ({
        kind: 'invoice',
        key: `invoice:${invoice.id}`,
        severity: 'danger',
        // Une facture n'est pas rattachée à un bateau : la ligne porte le client.
        boatId: 0,
        boatName: invoice.clientName ?? invoice.number,
        date: invoice.dueAt?.toISODate() ?? null,
        href: '/invoices?status=overdue',
        invoiceId: invoice.id,
        number: invoice.number,
        clientName: invoice.clientName,
        total: Number.parseFloat(invoice.total),
        dueAt: invoice.dueAt?.toISODate() ?? null,
      })),
    }
  }
}
