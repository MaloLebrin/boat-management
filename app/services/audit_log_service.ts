import AuditLog from '#models/audit_log'
import Organization from '#models/organization'
import { PLAN_LIMITS } from '#shared/types/plan'
import type {
  AuditAction,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPage,
} from '#shared/types/audit_log'
import { AUDIT_ACTIONS_BY_FAMILY } from '#shared/types/audit_log'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

const PER_PAGE = 25
const EXPORT_CHUNK = 500

@inject()
export default class AuditLogService {
  async log(params: {
    organizationId: number
    userId: number | null
    action: AuditAction
    entityType?: string
    entityId?: number
    metadata?: Record<string, unknown>
  }) {
    await AuditLog.create({
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      metadata: params.metadata ?? null,
    })
  }

  async list(organizationId: number, filters: AuditLogFilters): Promise<AuditLogPage> {
    const query = this.#filteredQuery(organizationId, filters)
      .preload('user')
      .orderBy('createdAt', 'desc')

    const page = filters.page ?? 1
    const paginated = await query.paginate(page, PER_PAGE)

    return {
      data: paginated.all().map((log) => this.toEntry(log)),
      meta: {
        total: paginated.total,
        perPage: paginated.perPage,
        currentPage: paginated.currentPage,
        lastPage: paginated.lastPage,
      },
    }
  }

  /**
   * Export CSV du journal (#856) — lecture par paquets pour ne pas charger
   * toute la rétention illimitée d'une organisation Entreprise d'un coup.
   */
  async *iterateForExport(
    organizationId: number,
    filters: Omit<AuditLogFilters, 'page'>
  ): AsyncGenerator<AuditLogEntry> {
    let page = 1
    for (;;) {
      const query = this.#filteredQuery(organizationId, filters)
        .preload('user')
        .orderBy('createdAt', 'desc')
      const paginated = await query.paginate(page, EXPORT_CHUNK)
      const rows = paginated.all()
      if (rows.length === 0) return
      for (const log of rows) {
        yield this.toEntry(log)
      }
      if (page >= paginated.lastPage) return
      page += 1
    }
  }

  async purgeExpired() {
    const orgs = await Organization.query().select('id', 'plan')

    for (const org of orgs) {
      const retentionDays = PLAN_LIMITS[org.plan].auditLogRetentionDays
      if (retentionDays === null) continue

      if (retentionDays === 0) {
        await AuditLog.query().where('organizationId', org.id).delete()
        continue
      }

      const cutoff = DateTime.now().minus({ days: retentionDays }).toISO()
      await AuditLog.query()
        .where('organizationId', org.id)
        .where('createdAt', '<', cutoff)
        .delete()
    }
  }

  canAccessAuditLog(org: Organization): boolean {
    return PLAN_LIMITS[org.plan].auditLogRetentionDays !== 0
  }

  /** Export CSV réservé à la rétention illimitée (plan Entreprise). */
  canExportAuditLog(org: Organization): boolean {
    return PLAN_LIMITS[org.plan].auditLogRetentionDays === null
  }

  #filteredQuery(organizationId: number, filters: AuditLogFilters) {
    const query = AuditLog.query().where('organizationId', organizationId)

    if (filters.userId) query.where('userId', filters.userId)
    if (filters.action) {
      query.where('action', filters.action)
    } else if (filters.family) {
      query.whereIn('action', [...AUDIT_ACTIONS_BY_FAMILY[filters.family]])
    }
    if (filters.from) query.where('createdAt', '>=', filters.from)
    if (filters.to) query.where('createdAt', '<=', filters.to)

    return query
  }

  private toEntry(log: AuditLog): AuditLogEntry {
    return {
      id: log.id,
      userId: log.userId,
      userFullName: log.user?.fullName ?? null,
      userEmail: log.user?.email ?? null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISO()!,
    }
  }
}
