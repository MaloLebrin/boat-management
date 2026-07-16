import type Organization from '#models/organization'
import type { PlanTier } from '#shared/types/plan'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis après commit quand le plan de l'organisation est mis à niveau
 * (`starter` → `pro` → `enterprise`). Pendant du `OrganizationPlanDowngraded`.
 * Le listener notifie les admins.
 */
export default class OrganizationPlanUpgraded extends BaseEvent {
  constructor(
    public readonly organization: Organization,
    public readonly fromPlan: PlanTier,
    public readonly toPlan: PlanTier
  ) {
    super()
  }
}
