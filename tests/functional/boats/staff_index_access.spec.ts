import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'

test.group('Staff index routes — mechanic/boat_owner access (functional, #396)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  const staffIndexRoutes = [
    { name: '/boats', path: '/boats' },
    { name: '/reservations', path: '/reservations' },
    { name: '/navigation/logbook', path: '/navigation/logbook' },
    { name: '/navigation/fuel', path: '/navigation/fuel' },
    { name: '/navigation/incidents', path: '/navigation/incidents' },
  ]

  for (const route of staffIndexRoutes) {
    test(`GET ${route.name} is denied to a mechanic (no matching capability)`, async ({
      client,
    }) => {
      const admin = await createAdminUser()
      await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
      const mechanic = await createMechanicUser(admin.organizationId!)

      const response = await client.get(route.path).loginAs(mechanic)

      response.assertStatus(403)
    })

    test(`GET ${route.name} redirects a boat_owner to the dedicated portal instead of leaking fleet data`, async ({
      client,
    }) => {
      const admin = await createAdminUser()
      await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
      const owner = await createBoatOwnerUser(admin.organizationId!)

      const response = await client.get(route.path).loginAs(owner).redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/owner/boats')
    })

    test(`GET ${route.name} stays accessible to a member (boats.view/incidents.view capability)`, async ({
      client,
    }) => {
      const admin = await createAdminUser()
      await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
      const member = await createMemberUser(admin.organizationId!)

      const response = await client.get(route.path).loginAs(member).withInertia()

      response.assertStatus(200)
    })
  }
})
