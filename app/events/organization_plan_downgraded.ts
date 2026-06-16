import type Organization from '#models/organization'
import type { PlanTier } from '#shared/types/plan'
import { BaseEvent } from '@adonisjs/core/events'

export default class OrganizationPlanDowngraded extends BaseEvent {
  constructor(
    public readonly organization: Organization,
    public readonly fromPlan: PlanTier,
    public readonly toPlan: PlanTier
  ) {
    super()
  }
}
