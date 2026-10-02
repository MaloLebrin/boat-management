import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis quand une facture passe de brouillon à envoyée (#890). Si son client
 * CRM porte l'e-mail d'un propriétaire de l'organisation, celui-ci la voit
 * arriver dans son portail.
 */
export default class InvoiceSent extends BaseEvent {
  constructor(
    public readonly organizationId: number,
    public readonly invoice: { id: number; number: string | null; clientId: number | null },
    public readonly actorId: number | null
  ) {
    super()
  }
}
