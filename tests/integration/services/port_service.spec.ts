import { test } from '@japa/runner'
import PortService from '#services/port_service'
import Port from '#models/port'
import { PortNotFoundError, PortHasBoatsError } from '#exceptions/port_errors'
import { UserNotInOrganizationError } from '#exceptions/organization_errors'
import { UserFactory } from '#database/factories/user_factory'
import { PortFactory } from '#database/factories/port_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import Spot from '#models/spot'

test.group('PortService (unit)', () => {
  // ── createForUser ────────────────────────────────────────────────────────

  test("createForUser crée un port dans l'organisation de l'utilisateur", async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const svc = new PortService()
    const port = await svc.createForUser(user, { name: 'Port Vieux' })

    assert.equal(port.name, 'Port Vieux')
    assert.equal(port.organizationId, user.organizationId!)
    assert.isNumber(port.id)
  })

  test('createForUser stocke les champs optionnels', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const svc = new PortService()
    const port = await svc.createForUser(user, {
      name: 'Port Méditerranée',
      city: 'Marseille',
      country: 'France',
      address: '1 quai du port',
      notes: 'Port principal',
    })

    assert.equal(port.city, 'Marseille')
    assert.equal(port.country, 'France')
    assert.equal(port.address, '1 quai du port')
    assert.equal(port.notes, 'Port principal')
  })

  test("createForUser throw UserNotInOrganizationError si l'user n'a pas d'org", async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    // l'utilisateur n'a pas d'organizationId
    user.organizationId = null as unknown as number

    const svc = new PortService()
    await assert.rejects(
      () => svc.createForUser(user, { name: 'Port X' }),
      UserNotInOrganizationError
    )
  })

  // ── getForUserOrFail ─────────────────────────────────────────────────────

  test("getForUserOrFail retourne le port de l'organisation", async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const svc = new PortService()
    const found = await svc.getForUserOrFail(user, port.id)

    assert.equal(found.id, port.id)
    assert.equal(found.name, port.name)
  })

  test("getForUserOrFail throw PortNotFoundError pour un port d'une autre org", async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const otherPort = await PortFactory.with('organization').create()

    const svc = new PortService()
    await assert.rejects(() => svc.getForUserOrFail(user, otherPort.id), PortNotFoundError)
  })

  test("getForUserOrFail throw PortNotFoundError si l'user n'a pas d'org", async ({ assert }) => {
    const user = await UserFactory.create()
    user.organizationId = null as unknown as number

    const svc = new PortService()
    await assert.rejects(() => svc.getForUserOrFail(user, 999), PortNotFoundError)
  })

  test('getForUserOrFail throw PortNotFoundError pour un id inexistant', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const svc = new PortService()
    await assert.rejects(() => svc.getForUserOrFail(user, 999999), PortNotFoundError)
  })

  // ── updateForUser ────────────────────────────────────────────────────────

  test('updateForUser met à jour les champs du port', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const svc = new PortService()
    const updated = await svc.updateForUser(user, port, {
      name: 'Nouveau Nom',
      city: 'Nice',
      country: 'France',
    })

    assert.equal(updated.name, 'Nouveau Nom')
    assert.equal(updated.city, 'Nice')
    assert.equal(updated.country, 'France')

    const persisted = await Port.findOrFail(port.id)
    assert.equal(persisted.name, 'Nouveau Nom')
  })

  test("updateForUser throw PortNotFoundError pour un port d'une autre org", async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const otherPort = await PortFactory.with('organization').create()

    const svc = new PortService()
    await assert.rejects(
      () => svc.updateForUser(user, otherPort, { name: 'Hack' }),
      PortNotFoundError
    )
  })

  // ── deleteForUser ────────────────────────────────────────────────────────

  test('deleteForUser supprime le port vide', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const svc = new PortService()
    await svc.deleteForUser(user, port)

    const found = await Port.find(port.id)
    assert.isNull(found)
  })

  test("deleteForUser throw PortNotFoundError pour un port d'une autre org", async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const otherPort = await PortFactory.with('organization').create()

    const svc = new PortService()
    await assert.rejects(() => svc.deleteForUser(user, otherPort), PortNotFoundError)
  })

  test('deleteForUser throw PortHasBoatsError quand un bateau est amarré via un pontoon', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const spot = await Spot.create({
      pontoonId: pontoon.id,
      mouillageId: null,
      name: 'A1',
      description: null,
      organizationId: user.organizationId!,
    })
    await BoatFactory.merge({ organizationId: user.organizationId!, spotId: spot.id }).create()

    const svc = new PortService()
    await assert.rejects(() => svc.deleteForUser(user, port), PortHasBoatsError)
  })

  // ── listForUser ──────────────────────────────────────────────────────────

  test("listForUser retourne uniquement les ports de l'organisation", async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    await PortFactory.merge({ organizationId: user.organizationId! }).createMany(2)
    // port d'une autre org
    await PortFactory.with('organization').create()

    const svc = new PortService()
    const ports = await svc.listForUser(user)

    assert.lengthOf(ports, 2)
    for (const p of ports) {
      assert.isNumber(p.id)
      assert.isString(p.name)
    }
  })

  test("listForUser retourne un tableau vide si l'user n'a pas d'org", async ({ assert }) => {
    const user = await UserFactory.create()
    user.organizationId = null as unknown as number

    const svc = new PortService()
    const ports = await svc.listForUser(user)

    assert.deepEqual(ports, [])
  })

  test('listForUser retourne les compteurs boatCount et freeSpots', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const spot = await Spot.create({
      pontoonId: pontoon.id,
      mouillageId: null,
      name: 'B1',
      description: null,
      organizationId: user.organizationId!,
    })
    await BoatFactory.merge({ organizationId: user.organizationId!, spotId: spot.id }).create()

    const svc = new PortService()
    const ports = await svc.listForUser(user)
    const found = ports.find((p) => p.id === port.id)

    assert.isDefined(found)
    assert.equal(found!.boatCount, 1)
    assert.equal(found!.totalSpots, 1)
    assert.equal(found!.freeSpots, 0)
  })

  // ── listWithSpotsForOrg ──────────────────────────────────────────────────

  test('listWithSpotsForOrg retourne les ports avec pontoons et mouillages préchargés', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    await PontoonFactory.merge({ portId: port.id }).create()

    const svc = new PortService()
    const ports = await svc.listWithSpotsForOrg(user)

    assert.isTrue(ports.length >= 1)
    const found = ports.find((p) => p.id === port.id)
    assert.isDefined(found)
    assert.isArray(found!.pontoons)
    assert.lengthOf(found!.pontoons, 1)
  })

  test("listWithSpotsForOrg retourne un tableau vide si l'user n'a pas d'org", async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    user.organizationId = null as unknown as number

    const svc = new PortService()
    const ports = await svc.listWithSpotsForOrg(user)

    assert.deepEqual(ports, [])
  })
})
