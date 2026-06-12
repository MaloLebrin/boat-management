import Spot from '#models/spot'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

export const SpotFactory = Factory.define(Spot, ({ faker }: FactoryContextContract) => ({
  name: 'A' + faker.number.int({ min: 1, max: 99 }),
  description: null,
  pontoonId: null,
  mouillageId: null,
}))
  .relation('organization', () => OrganizationFactory)
  .build()
