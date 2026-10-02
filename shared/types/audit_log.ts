export const AUDIT_ACTIONS = [
  'login',
  'logout',
  // Accès compte (#856) : mot de passe, reset, vérification e-mail, échecs.
  'auth.password_changed',
  'auth.reset_requested',
  'auth.reset_completed',
  'auth.email_verified',
  'auth.login_failed',
  // Double authentification (#884).
  'auth.2fa_enabled',
  'auth.2fa_disabled',
  'auth.2fa_recovery_used',
  'auth.2fa_recovery_regenerated',
  'auth.2fa_failed',
  // Sessions et appareils (#885) : une session coupée depuis la liste, ou
  // « déconnecter partout sauf ici ».
  'auth.session_revoked',
  'auth.logout_all',
  // Gestion du compte en libre-service (#886) : export de ses données,
  // suppression demandée, annulée (reconnexion) puis purgée. Le journal
  // survit à la purge, rattaché à un compte anonymisé.
  'account.export',
  'account.delete_requested',
  'account.delete_cancelled',
  'account.purged',
  'organization.2fa_required',
  // Suppression d'organisation (#886), récupérable pendant la période de grâce.
  'organization.delete_requested',
  'organization.delete_cancelled',
  'boat.create',
  'boat.update',
  'boat.delete',
  'boat.restore',
  'boat.force_delete',
  // Disponibilité (#870) : changement de statut, et réservation confirmée posée
  // malgré une indisponibilité (forçage admin, motif en métadonnée).
  'boat.status_change',
  'reservation.force_unavailable',
  // Argent de la location (#875) : encaissements et caution.
  'reservation.payment_recorded',
  'reservation.security_deposit_held',
  'reservation.security_deposit_released',
  'reservation.security_deposit_retained',
  'reservation.update',
  'reservation.cancel',
  'member.add',
  'member.remove',
  'member.update_role',
  // Départ volontaire d'un membre (#886), depuis ses réglages.
  'member.left',
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
  'client.update',
  'client.delete',
  'client.anonymize',
  'client.export',
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
  // Changement de plan via webhook Stripe (#856).
  'billing.plan_changed',
  // Paiement en ligne des factures (#876) : compte Stripe connecté de
  // l'organisation, et règlement confirmé par le webhook (sans auteur).
  'online_payments.connect',
  'online_payments.disconnect',
  'invoice.paid_online',
  // Cycle de vie facture / devis (#856).
  'invoice.create',
  'invoice.send',
  'invoice.delete',
  'invoice.converted',
  'invoice.mark_paid',
  // Avoir émis sur une facture (#877).
  'invoice.credit_note_issued',
  // Relances des factures en retard (#878) : e-mail au client (auteur `null`
  // pour le job quotidien), interrupteur « ne plus relancer », réglages.
  'invoice.reminder_sent',
  'invoice.reminders_disabled',
  'invoice.reminders_enabled',
  'invoice_reminders.update',
  // Contrats de location (#856).
  'contract.generated',
  'contract.sent',
  'contract.signed',
  // Organisation (#856) : nom et marque blanche.
  'organization.update',
  'organization.branding',
  // Clés IA BYOK (#856) — jamais la clé elle-même, seulement le fournisseur.
  'ai_key.set',
  'ai_key.rotate',
  'ai_key.remove',
  'ai_key.provider_changed',
  // Imports CSV (#856).
  'import.run',
  // Suppression manuelle de documents / médias (#856).
  'document.delete',
  // Exports (#879) : chaque export flotte ou comptable (qui, quoi, période,
  // lignes), l'export groupé des fiches clients, les comptes du FEC.
  'export.run',
  'client.export_bulk',
  'accounting_settings.update',
  // Synchronisation iCal (#880) : flux publié par jeton (création,
  // régénération, révocation) et calendriers externes importés.
  'calendar.token_created',
  'calendar.token_revoked',
  'external_calendar.added',
  'external_calendar.removed',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/**
 * Familles d'actions pour le filtre UI (#856). `auth` regroupe les connexions
 * historiques (`login`/`logout`) et les événements `auth.*`.
 */
export const AUDIT_FAMILIES = [
  'auth',
  'boat',
  'member',
  'maintenance',
  'incident',
  'reservation',
  'client',
  'billing',
  'invoice',
  'contract',
  'organization',
  'ai_key',
  'import',
  'document',
  'export',
  'calendar',
] as const

export type AuditFamily = (typeof AUDIT_FAMILIES)[number]

export const AUDIT_ACTIONS_BY_FAMILY: Record<AuditFamily, readonly AuditAction[]> = {
  auth: [
    'login',
    'logout',
    'auth.password_changed',
    'auth.reset_requested',
    'auth.reset_completed',
    'auth.email_verified',
    'auth.login_failed',
    'auth.2fa_enabled',
    'auth.2fa_disabled',
    'auth.2fa_recovery_used',
    'auth.2fa_recovery_regenerated',
    'auth.2fa_failed',
    'auth.session_revoked',
    'auth.logout_all',
    'account.export',
    'account.delete_requested',
    'account.delete_cancelled',
    'account.purged',
  ],
  boat: [
    'boat.create',
    'boat.update',
    'boat.delete',
    'boat.restore',
    'boat.force_delete',
    'boat.status_change',
  ],
  member: [
    'member.add',
    'member.remove',
    'member.update_role',
    'member.left',
    'invitation.send',
    'invitation.cancel',
    'invitation.accept',
  ],
  maintenance: [
    'maintenance_task.create',
    'maintenance_task.complete',
    'maintenance_task.delete',
    'maintenance_task.update',
    'maintenance_task.postpone',
    'maintenance_task.assign',
    'engine.add_hours',
    'navigation_log.create',
    'navigation_log.close',
    'fuel_log.create',
    'engine_part.set_stock',
  ],
  incident: ['incident.create', 'incident.update', 'incident.delete'],
  reservation: [
    'reservation.create',
    'reservation.update',
    'reservation.cancel',
    'reservation.force_unavailable',
    'reservation.payment_recorded',
    'reservation.security_deposit_held',
    'reservation.security_deposit_released',
    'reservation.security_deposit_retained',
  ],
  client: [
    'client.create',
    'client.update',
    'client.delete',
    'client.anonymize',
    'client.export',
    'client.export_bulk',
  ],
  billing: [
    'billing.checkout',
    'billing.portal',
    'billing.module_add',
    'billing.module_remove',
    'billing.module_activate',
    'billing.module_deactivate',
    'billing.addon_set',
    'billing.plan_changed',
    'online_payments.connect',
    'online_payments.disconnect',
  ],
  invoice: [
    'invoice.create',
    'invoice.send',
    'invoice.delete',
    'invoice.converted',
    'invoice.mark_paid',
    'invoice.paid_online',
    'invoice.credit_note_issued',
    'invoice.reminder_sent',
    'invoice.reminders_disabled',
    'invoice.reminders_enabled',
    'invoice_reminders.update',
  ],
  contract: ['contract.generated', 'contract.sent', 'contract.signed'],
  organization: [
    'organization.update',
    'organization.branding',
    'organization.2fa_required',
    'organization.delete_requested',
    'organization.delete_cancelled',
  ],
  ai_key: ['ai_key.set', 'ai_key.rotate', 'ai_key.remove', 'ai_key.provider_changed'],
  import: ['import.run'],
  document: ['document.delete'],
  export: ['export.run', 'accounting_settings.update'],
  calendar: [
    'calendar.token_created',
    'calendar.token_revoked',
    'external_calendar.added',
    'external_calendar.removed',
  ],
}

export function familyOfAction(action: AuditAction): AuditFamily | null {
  for (const family of AUDIT_FAMILIES) {
    if ((AUDIT_ACTIONS_BY_FAMILY[family] as readonly string[]).includes(action)) {
      return family
    }
  }
  return null
}

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
  family?: AuditFamily
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
