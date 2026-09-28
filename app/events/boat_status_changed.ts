import { BaseEvent } from '@adonisjs/core/events'
import type { BoatStatus } from '#shared/types/boat_status'

/**
 * Émis quand le statut d'un bateau change (#870). Le listener prévient les
 * admins de l'organisation et les propriétaires du bateau — sauf l'auteur du
 * changement.
 */
export default class BoatStatusChanged extends BaseEvent {
  constructor(
    public readonly organizationId: number,
    public readonly boat: { id: number; name: string },
    public readonly fromStatus: BoatStatus,
    public readonly toStatus: BoatStatus,
    public readonly reason: string | null,
    public readonly changedBy: { id: number; name: string }
  ) {
    super()
  }
}
