import type Organization from '#models/organization'
import type { PlanModule } from '#shared/types/plan'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis après commit quand un module add-on souscrit disparaît de l'abonnement
 * Stripe (résiliation, downgrade, annulation — épic #327, lot 5). Le listener
 * notifie les admins ; les données du module restent consultables en lecture
 * seule (voir lot 5b).
 */
export default class OrganizationModuleDeactivated extends BaseEvent {
  constructor(
    public readonly organization: Organization,
    public readonly module: PlanModule
  ) {
    super()
  }
}
