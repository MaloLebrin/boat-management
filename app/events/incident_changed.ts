import { BaseEvent } from '@adonisjs/core/events'

export type IncidentChange = 'created' | 'resolved'

/**
 * Émis quand un incident est déclaré ou clôturé (#888). Le listener prévient
 * l'équipe de l'organisation — sauf l'auteur.
 */
export default class IncidentChanged extends BaseEvent {
  constructor(
    public readonly organizationId: number,
    public readonly incident: { id: number; boatId: number; boatName: string; type: string },
    public readonly change: IncidentChange,
    public readonly actor: { id: number; name: string }
  ) {
    super()
  }
}
