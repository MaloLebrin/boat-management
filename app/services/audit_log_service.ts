import AuditLog from '#models/audit_log'
import Organization from '#models/organization'
import { PLAN_LIMITS } from '#shared/types/plan'
import type {
  AuditAction,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPage,
} from '#shared/types/audit_log'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

const PER_PAGE = 25

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
    const query = AuditLog.query()
      .where('organizationId', organizationId)
      .preload('user')
      .orderBy('createdAt', 'desc')

    if (filters.userId) query.where('userId', filters.userId)
    if (filters.action) query.where('action', filters.action)
    if (filters.from) query.where('createdAt', '>=', filters.from)
    if (filters.to) query.where('createdAt', '<=', filters.to)

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
