import { BaseEvent } from '@adonisjs/core/events'

export type OwnerBoatChange = 'maintenance_done' | 'incident_created' | 'approval_requested'

/**
 * Émis quand il se passe sur un bateau confié quelque chose que son
 * propriétaire doit savoir (#890) : une tâche faite, un incident déclaré, un
 * devis qui attend son accord. Le listener prévient les propriétaires du
 * bateau — jamais ceux d'un autre.
 */
export default class OwnerBoatChanged extends BaseEvent {
  constructor(
    public readonly organizationId: number,
    public readonly boat: { id: number; name: string },
    public readonly change: OwnerBoatChange,
    /** `labelKey` : clé i18n traduite dans la langue de chaque destinataire, à défaut `label`. */
    public readonly subject: { id: number; label: string; labelKey?: string },
    public readonly actorId: number | null
  ) {
    super()
  }
}
