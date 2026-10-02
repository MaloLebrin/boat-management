import type InvoiceSent from '#events/invoice_sent'
import Client from '#models/client'
import NotificationAudienceService from '#services/notification_audience_service'
import NotificationService from '#services/notification_service'
import { toAppLocale } from '#shared/helpers/locale_path'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

/**
 * Facture envoyée (#890) : si son client est un propriétaire de l'organisation
 * (même e-mail), il en est prévenu. Une facture à un client ordinaire ne
 * notifie personne.
 */
@inject()
export default class OnInvoiceSent {
  constructor(
    private notificationService: NotificationService,
    private audience: NotificationAudienceService
  ) {}

  async handle(event: InvoiceSent) {
    const { invoice } = event
    if (invoice.clientId === null) return

    const client = await Client.query()
      .select('id', 'email')
      .where('id', invoice.clientId)
      .where('organizationId', event.organizationId)
      .first()
    if (!client?.email) return

    const owners = await this.audience.ownersByEmail(event.organizationId, client.email)

    await Promise.all(
      owners.map((owner) => {
        const locale = i18nManager.locale(toAppLocale(owner.locale))
        const params = { number: invoice.number ?? '' }
        return this.notificationService.create({
          userId: owner.userId,
          organizationId: event.organizationId,
          type: 'owner.invoice_sent',
          severity: 'info',
          title: locale.formatMessage('notifications.messages.owner.invoice_sent.title', params),
          body: locale.formatMessage('notifications.messages.owner.invoice_sent.body', params),
          actionUrl: '/owner/boats',
          metadata: { invoiceId: invoice.id },
        })
      })
    )
  }
}
