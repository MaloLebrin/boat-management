export const AUDIT_ACTIONS = [
  'login',
  'logout',
  'boat.create',
  'boat.update',
  'boat.delete',
  // Disponibilité (#870) : changement de statut, et réservation confirmée posée
  // malgré une indisponibilité (forçage admin, motif en métadonnée).
  'boat.status_change',
  'reservation.force_unavailable',
  // Argent de la location (#875) : encaissements et caution.
  'reservation.payment_recorded',
  'reservation.security_deposit_held',
  'reservation.security_deposit_released',
  'reservation.security_deposit_retained',
  'member.add',
  'member.remove',
  'member.update_role',
  'invitation.send',
  'invitation.cancel',
  'invitation.accept',
  'maintenance_task.create',
  'maintenance_task.complete',
  'maintenance_task.delete',
  // Modification d'une tâche planifiée (#867) : `postpone` quand seule
  // l'échéance recule, `update` pour toute autre correction.
  'maintenance_task.update',
  'maintenance_task.postpone',
  'maintenance_task.assign',
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
  // Cycle de vie complet d'un incident depuis l'onglet (#816) — `incident.create`
  // ci-dessus est partagé avec le copilote.
  'incident.update',
  'incident.delete',
  // Facturation (#843) : chaque geste qui parle à Stripe ou change les modules
  // de l'organisation, réservé à `subscription.manage`.
  'billing.checkout',
  'billing.portal',
  'billing.module_add',
  'billing.module_remove',
  'billing.module_activate',
  'billing.module_deactivate',
  'billing.addon_set',
  // Paiement en ligne des factures (#876) : compte Stripe connecté de
  // l'organisation, et règlement confirmé par le webhook (sans auteur).
  'online_payments.connect',
  'online_payments.disconnect',
  'invoice.paid_online',
  // Avoir émis sur une facture (#877).
  'invoice.credit_note_issued',
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
