import Organization from '#models/organization'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

export const OrganizationFactory = Factory.define(
  Organization,
  ({ faker }: FactoryContextContract) => {
    const name = faker.company.name()
    return {
      name,
      slug: `${faker.helpers.slugify(name).toLowerCase().slice(0, 30)}-${faker.string.alphanumeric(6)}`,
      plan: 'starter' as const,
    }
  }
).build()
