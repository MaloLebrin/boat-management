import type InvoicePaid from '#events/invoice_paid'
import NotificationAudienceService from '#services/notification_audience_service'
import NotificationService from '#services/notification_service'
import { toAppLocale } from '#shared/helpers/locale_path'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

/** Facture marquée réglée à la main (#888) : l'équipe, sauf l'auteur. */
@inject()
export default class OnInvoicePaid {
  constructor(
    private notificationService: NotificationService,
    private audience: NotificationAudienceService
  ) {}

  async handle(event: InvoicePaid) {
    const { invoice } = event
    const members = await this.audience.staffOf(event.organizationId, event.actorId)

    await Promise.all(
      members.map((member) => {
        const locale = i18nManager.locale(toAppLocale(member.locale))
        const params = {
          number: invoice.number ?? '',
          clientName: invoice.clientName ?? '',
        }
        return this.notificationService.create({
          userId: member.userId,
          organizationId: event.organizationId,
          type: 'invoice.paid',
          severity: 'success',
          title: locale.formatMessage('notifications.messages.invoice.paid.title', params),
          body: locale.formatMessage('notifications.messages.invoice.paid.body', params),
          actionUrl: `/invoices/${invoice.id}`,
          metadata: { invoiceId: invoice.id },
        })
      })
    )
  }
}
