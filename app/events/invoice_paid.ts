import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis quand une facture est marquée réglée à la main (#888) ; le règlement en
 * ligne a sa propre notification (`invoice.paid_online`). Le listener prévient
 * l'équipe — sauf l'auteur.
 */
export default class InvoicePaid extends BaseEvent {
  constructor(
    public readonly organizationId: number,
    public readonly invoice: { id: number; number: string | null; clientName: string | null },
    public readonly actorId: number | null
  ) {
    super()
  }
}
