import Notification from '#models/notification'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

export const NotificationFactory = Factory.define(
  Notification,
  ({ faker }: FactoryContextContract) => ({
    type: 'member.joined' as const,
    severity: 'info' as const,
    title: faker.lorem.sentence(),
    body: null,
    actionUrl: null,
    metadata: null,
    readAt: null,
  })
).build()
