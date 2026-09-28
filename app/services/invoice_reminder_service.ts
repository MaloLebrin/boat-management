import { CannotRemindInvoiceError, InvoiceReminderRecipientError } from '#exceptions/invoice_errors'
import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceReminder from '#models/invoice_reminder'
import type Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import AuditLogService from '#services/audit_log_service'
import EmailQueueService from '#services/email_queue_service'
import NotificationService from '#services/notification_service'
import QuotaService from '#services/quota_service'
import { INVOICE_REMINDER_TIERS } from '#shared/constants/invoice_reminders'
import { formatDateLong } from '#shared/helpers/date_format'
import {
  canRemindInvoice,
  dueReminderTier,
  nextManualReminderTier,
} from '#shared/helpers/invoice_reminders'
import { formatCurrency } from '#shared/helpers/number_format'
import type { NotificationSeverity, NotificationType } from '#shared/types/notification'
import type {
  InvoiceRemindersInfo,
  InvoiceRemindersRunResult,
  InvoiceRemindersSettings,
  InvoiceReminderSkipReason,
  InvoiceReminderTrigger,
  UpdateInvoiceRemindersSettingsPayload,
} from '#shared/types/invoice_reminder'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/** Fuseau des crons du scheduler : « J+3 » se compte en jours de Paris. */
const REMINDERS_ZONE = 'Europe/Paris'

/**
 * Relances des factures en retard (#878).
 *
 * Le job quotidien (06:30, après le passage en `overdue` de 06:00) envoie à
 * chaque facture en retard le palier atteint (J+3, J+10, J+30 après
 * l'échéance) s'il n'a pas déjà été traité. Un palier atteint sans destinataire
 * possible (client absent, sans e-mail, anonymisé, blacklisté) est inscrit
 * « non envoyé » et l'organisation en est prévenue à la place.
 */
@inject()
export default class InvoiceReminderService {
  constructor(
    private emailQueueService: EmailQueueService,
    private notificationService: NotificationService,
    private auditLogService: AuditLogService,
    private quotaService: QuotaService
  ) {}

  /** Pourquoi ce client ne peut pas recevoir de relance, ou `null`. */
  skipReasonFor(client: Client | null): InvoiceReminderSkipReason | null {
    if (!client) return 'no_client'
    if (client.anonymizedAt) return 'anonymized'
    if (client.status === 'blacklisted') return 'blacklisted'
    if (!client.email) return 'no_email'
    return null
  }

  /** Passage quotidien : un palier par facture au plus. */
  async runDaily(now: DateTime = DateTime.now()): Promise<InvoiceRemindersRunResult> {
    const today = now.setZone(REMINDERS_ZONE).toISODate()
    const result: InvoiceRemindersRunResult = { sent: 0, skipped: 0 }
    if (!today) return result

    const invoices = await Invoice.query()
      .where('kind', 'invoice')
      .where('status', 'overdue')
      .where('remindersDisabled', false)
      .whereNotNull('dueAt')
      .whereHas('organization', (q) => q.where('invoiceRemindersEnabled', true))
      .preload('organization')
      .orderBy('id')

    // Module Facturation résilié : plus de courrier au nom de l'organisation.
    const moduleActive = new Map<number, boolean>()

    for (const invoice of invoices) {
      const tier = dueReminderTier(
        invoice.dueAt?.toISODate() ?? null,
        invoice.lastReminderTier,
        today
      )
      if (tier === null) continue

      const org = invoice.organization
      if (!moduleActive.has(org.id)) {
        moduleActive.set(org.id, await this.quotaService.canManageInvoices(org))
      }
      if (!moduleActive.get(org.id)) continue

      try {
        const reminder = await this.#remind(invoice, org, {
          tier,
          trigger: 'automatic',
          userId: null,
          locale: i18nManager.defaultLocale,
        })
        if (reminder?.outcome === 'sent') result.sent++
        if (reminder?.outcome === 'skipped') result.skipped++
      } catch (error) {
        logger.error({ err: error, invoiceId: invoice.id }, 'Invoice reminder failed')
      }
    }

    return result
  }

  /** « Relancer maintenant » depuis la fiche facture. */
  async sendNow(
    invoice: Invoice,
    org: Organization,
    userId: number,
    locale: string
  ): Promise<InvoiceReminder> {
    const reminder = await this.#remind(invoice, org, {
      tier: nextManualReminderTier(invoice.lastReminderTier),
      trigger: 'manual',
      userId,
      locale,
    })
    if (!reminder) throw new CannotRemindInvoiceError()
    return reminder
  }

  /** Interrupteur « ne plus relancer » (client en litige). */
  async setDisabled(invoice: Invoice, disabled: boolean, userId: number): Promise<Invoice> {
    if (invoice.kind !== 'invoice') throw new CannotRemindInvoiceError()
    invoice.remindersDisabled = disabled
    await invoice.save()

    await this.auditLogService.log({
      organizationId: invoice.organizationId,
      userId,
      action: disabled ? 'invoice.reminders_disabled' : 'invoice.reminders_enabled',
      entityType: 'invoice',
      entityId: invoice.id,
      metadata: { number: invoice.number },
    })
    return invoice
  }

  async infoFor(invoice: Invoice, org: Organization): Promise<InvoiceRemindersInfo> {
    const history = await InvoiceReminder.query()
      .where('invoiceId', invoice.id)
      .where('organizationId', org.id)
      .preload('user')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')

    return {
      count: invoice.reminderCount ?? 0,
      lastReminderAt: invoice.lastReminderAt?.toISO() ?? null,
      disabled: invoice.remindersDisabled ?? false,
      automaticEnabled: org.invoiceRemindersEnabled,
      history: history.map((reminder) => ({
        id: reminder.id,
        tier: reminder.tier,
        trigger: reminder.trigger,
        outcome: reminder.outcome,
        skipReason: reminder.skipReason,
        userName: reminder.user?.fullName ?? null,
        createdAt: reminder.createdAt.toISO()!,
      })),
    }
  }

  async settingsFor(org: Organization, canManage: boolean): Promise<InvoiceRemindersSettings> {
    return {
      available: await this.quotaService.canManageInvoices(org),
      enabled: org.invoiceRemindersEnabled,
      message: org.invoiceReminderMessage,
      latePenaltyNote: org.invoiceLatePenaltyNote,
      tiers: INVOICE_REMINDER_TIERS,
      canManage,
    }
  }

  async updateSettings(
    org: Organization,
    payload: UpdateInvoiceRemindersSettingsPayload,
    userId: number
  ): Promise<Organization> {
    org.invoiceRemindersEnabled = payload.enabled
    if (payload.message !== undefined) org.invoiceReminderMessage = payload.message?.trim() || null
    if (payload.latePenaltyNote !== undefined) {
      org.invoiceLatePenaltyNote = payload.latePenaltyNote?.trim() || null
    }
    await org.save()

    await this.auditLogService.log({
      organizationId: org.id,
      userId,
      action: 'invoice_reminders.update',
      entityType: 'organization',
      entityId: org.id,
      metadata: { enabled: payload.enabled },
    })
    return org
  }

  /**
   * Prévient les administrateurs qu'une facture vient de passer en retard —
   * appelé par le job de 06:00 avec les factures qu'il vient de basculer.
   */
  async notifyOverdue(invoices: Invoice[]): Promise<void> {
    for (const invoice of invoices) {
      try {
        await this.#notifyAdmins(invoice, 'invoice.overdue', 'warning')
      } catch (error) {
        logger.error({ err: error, invoiceId: invoice.id }, 'Overdue invoice notification failed')
      }
    }
  }

  /**
   * Inscrit la relance sous verrou (deux passages simultanés ne rejouent pas un
   * palier), puis, une fois la transaction validée, met l'e-mail en file et
   * prévient l'organisation. Rend `null` quand il n'y a rien à faire.
   */
  async #remind(
    invoice: Invoice,
    org: Organization,
    options: {
      tier: number
      trigger: InvoiceReminderTrigger
      userId: number | null
      locale: string
    }
  ): Promise<InvoiceReminder | null> {
    const manual = options.trigger === 'manual'

    const recorded = await db.transaction(async (trx) => {
      const locked = await Invoice.query({ client: trx })
        .where('id', invoice.id)
        .where('organizationId', org.id)
        .forUpdate()
        .first()
      if (!locked || !canRemindInvoice(locked)) {
        if (manual) throw new CannotRemindInvoiceError()
        return null
      }
      if (!manual && options.tier <= locked.lastReminderTier) return null

      const client = locked.clientId
        ? await Client.query({ client: trx })
            .where('id', locked.clientId)
            .where('organizationId', org.id)
            .first()
        : null
      const skipReason = this.skipReasonFor(client)
      if (manual && skipReason) throw new InvoiceReminderRecipientError(skipReason)

      const reminder = await InvoiceReminder.create(
        {
          organizationId: org.id,
          invoiceId: locked.id,
          tier: options.tier,
          trigger: options.trigger,
          outcome: skipReason ? 'skipped' : 'sent',
          skipReason,
          userId: options.userId,
        },
        { client: trx }
      )

      locked.lastReminderTier = Math.max(locked.lastReminderTier, options.tier)
      if (!skipReason) {
        locked.reminderCount += 1
        locked.lastReminderAt = DateTime.now()
      }
      await locked.useTransaction(trx).save()

      return { reminder, invoice: locked, to: skipReason ? null : client!.email! }
    })
    if (!recorded) return null

    const { reminder, to } = recorded
    if (to) {
      await this.emailQueueService.sendInvoiceReminder({
        invoiceId: recorded.invoice.id,
        organizationId: org.id,
        to,
        locale: options.locale,
        tier: options.tier,
        dedupKey: manual
          ? `invoice_reminder:${recorded.invoice.id}:manual:${reminder.id}`
          : `invoice_reminder:${recorded.invoice.id}:${options.tier}`,
      })
      await this.auditLogService.log({
        organizationId: org.id,
        userId: options.userId,
        action: 'invoice.reminder_sent',
        entityType: 'invoice',
        entityId: recorded.invoice.id,
        metadata: { number: recorded.invoice.number, tier: options.tier, trigger: options.trigger },
      })
    }

    // Une relance manuelle est le geste de celui qui la fait : pas besoin de
    // le lui notifier. Le job, lui, rend compte de ce qu'il a fait (ou pas).
    if (!manual) {
      await this.#notifyAdmins(
        recorded.invoice,
        to ? 'invoice.reminder_sent' : 'invoice.reminder_skipped',
        to ? 'info' : 'warning',
        { tier: String(options.tier), reason: reminder.skipReason }
      )
    }

    return reminder
  }

  async #notifyAdmins(
    invoice: Invoice,
    type: NotificationType,
    severity: NotificationSeverity,
    extra: { tier?: string; reason?: InvoiceReminderSkipReason | null } = {}
  ): Promise<void> {
    const i18n = i18nManager.locale(i18nManager.defaultLocale)
    const key = type.replace('invoice.', '')
    const params = {
      number: invoice.number,
      clientName: invoice.clientName ?? '—',
      amount: formatCurrency(Number.parseFloat(invoice.total), i18n.locale, {
        currency: invoice.currency,
      }),
      dueDate: invoice.dueAt ? formatDateLong(invoice.dueAt.toISODate()!, i18n.locale) : '—',
      tier: extra.tier ?? '',
      reason: extra.reason ? i18n.t(`invoices.reminders.skipReason.${extra.reason}`) : '',
    }
    const admins = await OrganizationMembership.query()
      .where('organizationId', invoice.organizationId)
      .where('role', 'admin')

    await Promise.all(
      admins.map((admin) =>
        this.notificationService.create({
          userId: admin.userId,
          organizationId: invoice.organizationId,
          type,
          severity,
          title: i18n.t(`notifications.messages.invoice.${key}.title`, params),
          body: i18n.t(`notifications.messages.invoice.${key}.body`, params),
          actionUrl: `/invoices/${invoice.id}`,
          metadata: { invoiceId: invoice.id },
        })
      )
    )
  }
}
