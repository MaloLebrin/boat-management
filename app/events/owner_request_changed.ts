import { BaseEvent } from '@adonisjs/core/events'

export type OwnerRequestChange = 'request_created' | 'approval_decided'

/**
 * Émis quand un propriétaire agit depuis son portail (#890) : une demande
 * déposée, un devis accepté ou refusé. Le listener prévient l'équipe.
 */
export default class OwnerRequestChanged extends BaseEvent {
  constructor(
    public readonly organizationId: number,
    public readonly boat: { id: number; name: string },
    public readonly task: { id: number; title: string },
    public readonly change: OwnerRequestChange,
    public readonly owner: { id: number; name: string },
    public readonly decision: 'approved' | 'rejected' | null = null
  ) {
    super()
  }
}
