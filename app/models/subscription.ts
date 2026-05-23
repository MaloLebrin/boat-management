import { SubscriptionSchema } from '#database/schema'
import Organization from '#models/organization'
import type { BillingInterval, SubscriptionStatus } from '#shared/types/billing'
import type { PlanTier } from '#shared/types/plan'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Subscription extends SubscriptionSchema {
  declare planTier: PlanTier
  declare status: SubscriptionStatus
  declare billingInterval: BillingInterval

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
