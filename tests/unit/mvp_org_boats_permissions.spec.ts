import { test } from '@japa/runner'
import UserService from '#services/user_service'
import OrganizationService from '#services/organization_service'
import BoatService from '#services/boat_service'
import BoatEquipmentService from '#services/boat_equipment_service'
import BoatEngineService from '#services/boat_engine_service'
import BoatSailService from '#services/boat_sail_service'
import BoatRigService from '#services/boat_rig_service'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatSafetyEquipmentService from '#services/boat_safety_equipment_service'
import BoatPolicy from '#policies/boat_policy'
import Organization from '#models/organization'
import User from '#models/user'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'

test.group('MVP org/users/boats/permissions (unit)', (group) => {
  group.each.teardown(async () => {
    await BoatEngine.query().delete()
    await BoatSail.query().delete()
    await BoatRig.query().delete()
    await Boat.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

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
    const org1 = await Organization.create({ name: 'Org 1', slug: 'org-1-u' })
    const org2 = await Organization.create({ name: 'Org 2', slug: 'org-2-u' })

    const user1 = await User.create({
      email: 'u1@example.com',
      password: 'Password123!',
      fullName: 'U1',
      organizationId: org1.id,
    })

    await Boat.create({
      organizationId: org1.id,
      name: 'Org1 Boat',
      registrationNumber: 'A1',
      type: null,
    })
    await Boat.create({
      organizationId: org2.id,
      name: 'Org2 Boat',
      registrationNumber: 'B1',
      type: null,
    })

    const boatService = new BoatService()
    const boats = await boatService.listForUser(user1)

    assert.equal(boats.length, 1)
    assert.equal(boats[0]!.organizationId, org1.id)
    assert.equal(boats[0]!.name, 'Org1 Boat')
  })

  test('BoatService hull create then equipment methods add engines, sails, and rig', async ({
    assert,
  }) => {
    const org = await Organization.create({ name: 'Org', slug: 'org-create' })
    const user = await User.create({
      email: 'builder@example.com',
      password: 'Password123!',
      fullName: 'Builder',
      organizationId: org.id,
    })

    const boatService = new BoatService()
    const equipmentService = new BoatEquipmentService(
      new BoatEngineService(),
      new BoatSailService(),
      new BoatRigService(),
      new BoatEnginePartService(),
      new BoatSafetyEquipmentService()
    )
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
      hours: 1200,
    })
    await equipmentService.createEngine(user, boat, {
      kind: 'electric',
      fuel: 'electric',
      brand: 'Torqeedo',
      model: 'Cruise',
      manufacturedAt: '2021-09-15',
      powerHp: 6.7,
      hours: 50,
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
    const org = await Organization.create({ name: 'Org', slug: 'org-mast' })
    const user = await User.create({
      email: 'sailor@example.com',
      password: 'Password123!',
      fullName: 'Sailor',
      organizationId: org.id,
    })

    const boatService = new BoatService()

    await assert.rejects(
      () =>
        boatService.createForUser(user, {
          name: 'No Mast Height',
          propulsionType: 'sailboat',
        }),
      /mastHeightM is required/i
    )
  })

  test('boat abilities deny cross-organization access', async ({ assert }) => {
    const org1 = await Organization.create({ name: 'Org 1', slug: 'org-1-a' })
    const org2 = await Organization.create({ name: 'Org 2', slug: 'org-2-a' })

    const user = await User.create({
      email: 'u@example.com',
      password: 'Password123!',
      fullName: 'U',
      organizationId: org2.id,
    })

    const boat = await Boat.create({
      organizationId: org1.id,
      name: 'Secret Boat',
      registrationNumber: null,
      type: null,
    })

    const policy = new BoatPolicy()
    const response = policy.view(user, boat)
    assert.isFalse(response)
  })
})
