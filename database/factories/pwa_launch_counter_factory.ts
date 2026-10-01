import Factory from '@adonisjs/lucid/factories'
import PwaLaunchCounter from '#models/pwa_launch_counter'
import { OrganizationFactory } from '#database/factories/organization_factory'

export const PwaLaunchCounterFactory = Factory.define(PwaLaunchCounter, () => {
  return {
    launches: 1,
  }
})
  .relation('organization', () => OrganizationFactory)
  .build()
