import { test } from '@japa/runner'
import UserService from '#services/user_service'
import OrganizationService from '#services/organization_service'
import BoatService from '#services/boat_service'
import BoatEquipmentService from '#services/boat_equipment_service'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import app from '@adonisjs/core/services/app'

test.group('MVP org/users/boats/permissions (integration)', () => {
  test('signupWithOrganization creates org and links user', async ({ assert }) => {
    const userService = new UserService(new OrganizationService())

    const { organization, user } = await userService.signupWithOrganization({
      email: 'alice@example.com',
      password: 'Password123!',
      fullName: 'Alice Doe',
    })

    assert.equal(user.organizationId, organization.id)
    assert.equal(organization.name, 'Alice Doe')
    assert.isString(organization.slug)
    assert.isAbove(organization.slug.length, 0)
  })

  test('BoatService.listForUser is scoped by organization', async ({ assert }) => {
    const org1 = await OrganizationFactory.create()
    const org2 = await OrganizationFactory.create()

    const user1 = await UserFactory.merge({ organizationId: org1.id }).create()

    await BoatFactory.merge({
      organizationId: org1.id,
      name: 'Org1 Boat',
      registrationNumber: 'A1',
    }).create()
    await BoatFactory.merge({
      organizationId: org2.id,
      name: 'Org2 Boat',
      registrationNumber: 'B1',
    }).create()

    const boatService = await app.container.make(BoatService)
    const boats = await boatService.listForUser(user1)

    assert.equal(boats.length, 1)
    assert.equal(boats[0]!.organizationId, org1.id)
    assert.equal(boats[0]!.name, 'Org1 Boat')
  })

  test('BoatService hull create then equipment methods add engines, sails, and rig', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()

    const boatService = await app.container.make(BoatService)
    const equipmentService = await app.container.make(BoatEquipmentService)
    const boat = await boatService.createForUser(user, {
      name: 'My Boat',
      manufacturedAt: '2020-01-10',
      propulsionType: 'sailboat',
      mastHeightM: 14.2,
      lengthM: 10.5,
      beamM: 3.2,
      hullMaterial: 'fiberglass',
    })

    await equipmentService.createEngine(user, boat, {
      kind: 'inboard',
      fuel: 'diesel',
      brand: 'Yanmar',
      model: '3YM',
      manufacturedAt: '2019-05-01',
      powerHp: 28,
      installHours: 1200,
    })
    await equipmentService.createEngine(user, boat, {
      kind: 'electric',
      fuel: 'electric',
      brand: 'Torqeedo',
      model: 'Cruise',
      manufacturedAt: '2021-09-15',
      powerHp: 6.7,
      installHours: 50,
    })
    await equipmentService.createSail(user, boat, {
      sailType: 'main',
      manufacturedAt: '2020-02-02',
      areaM2: 35,
      material: 'dacron',
      reefPoints: 2,
    })
    await equipmentService.upsertRig(user, boat, {
      rigType: 'sloop',
      manufacturedAt: '2020-03-03',
      mastCount: 1,
      spreaders: 2,
    })

    await boat.load('engines')
    await boat.load('sails')
    await boat.load('rig')

    assert.equal(boat.engines.length, 2)
    assert.equal(boat.sails.length, 1)
    assert.isNotNull(boat.rig)
  })

  test('sailboat requires mastHeightM', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const boatService = await app.container.make(BoatService)

    await assert.rejects(
      () =>
        boatService.createForUser(user, {
          name: 'No Mast Height',
          propulsionType: 'sailboat',
        }),
      /mastHeightM is required/i
    )
  })
})
