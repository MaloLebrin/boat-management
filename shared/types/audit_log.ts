export const AUDIT_ACTIONS = [
  'login',
  'logout',
  'boat.create',
  'boat.update',
  'boat.delete',
  'member.add',
  'member.remove',
  'member.update_role',
  'invitation.send',
  'invitation.cancel',
  'invitation.accept',
  'maintenance_task.create',
  'maintenance_task.complete',
  'maintenance_task.delete',
  // Actions confirmées depuis le copilote FleetAi (agent actionnable) : même
  // journal que les créations manuelles correspondantes.
  'engine.add_hours',
  'navigation_log.create',
  'navigation_log.close',
  'fuel_log.create',
  'incident.create',
  'reservation.create',
  'client.create',
  'engine_part.set_stock',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export interface AuditLogEntry {
  id: number
  userId: number | null
  userFullName: string | null
  userEmail: string | null
  action: AuditAction
  entityType: string | null
  entityId: number | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AuditLogFilters {
  userId?: number
  action?: AuditAction
  from?: string
  to?: string
  page?: number
}

export interface AuditLogPage {
  data: AuditLogEntry[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}
