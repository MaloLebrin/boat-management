import Subscription from '#models/subscription'
import type { BillingInterval, SubscriptionStatus } from '#shared/types/billing'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { DateTime } from 'luxon'

export const SubscriptionFactory = Factory.define(
  Subscription,
  ({ faker }: FactoryContextContract) => ({
    planTier: faker.helpers.arrayElement(['pro', 'enterprise']) as 'pro' | 'enterprise',
    status: faker.helpers.arrayElement(['active', 'trialing']) as SubscriptionStatus,
    billingInterval: faker.helpers.arrayElement(['month', 'year']) as BillingInterval,
    stripeSubscriptionId: 'sub_' + faker.string.alphanumeric(24),
    stripePriceId: 'price_' + faker.string.alphanumeric(24),
    currentPeriodStart: DateTime.now(),
    currentPeriodEnd: DateTime.now().plus({ months: 1 }),
    cancelAtPeriodEnd: false,
  })
)
  .relation('organization', () => OrganizationFactory)
  .build()
