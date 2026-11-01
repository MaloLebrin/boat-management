import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatBattery from '#models/boat_battery'
import BoatEngine from '#models/boat_engine'
import BoatTank from '#models/boat_tank'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'
import { boatWithSource } from '#tests/functional/instruments/helpers'
import { BoatBatteryFactory } from '#database/factories/boat_battery_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import BoatInstrumentDevice from '#models/boat_instrument_device'
import { DateTime } from 'luxon'

/** « Tout rattacher » (#1037) : crée et relie en une transaction. */

const item = (over: Record<string, unknown>) => ({
  kind: 'battery',
  instrumentKey: 'house',
  name: 'Servitude',
  existingId: null,
  tankType: null,
  ...over,
})

test.group('POST /boats/:id/instrument-mapping/apply', (group) => {
  group.each.setup(() => truncateDb())

  test('relie le moteur, relie une batterie existante, crée batterie et cuve', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      instrumentKey: null,
      instrumentRunTimeS: 3600,
    }).create()
    const battery = await BoatBatteryFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/instrument-mapping/apply`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}?tab=instruments`)
      .json({
        items: [
          item({ kind: 'engine', instrumentKey: 'port', name: 'Bâbord', existingId: engine.id }),
          item({ instrumentKey: 'start', existingId: battery.id }),
          item({ instrumentKey: 'house', name: 'Servitude (BMV-712)' }),
          item({
            kind: 'tank',
            instrumentKey: 'fuel.0',
            name: 'Gasoil (Maretron TLM100)',
            tankType: 'fuel',
          }),
        ],
      })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(response.header('location'), `/boats/${boat.id}?tab=instruments`)
    assert.exists(response.flashMessages().success)

    const linkedEngine = await BoatEngine.findOrFail(engine.id)
    assert.equal(linkedEngine.instrumentKey, 'port')
    assert.isNull(linkedEngine.instrumentRunTimeS)
    const fresh1 = await BoatBattery.findOrFail(battery.id)
    assert.equal(fresh1.instrumentKey, 'start')
    const created = await BoatBattery.query()
      .where('boatId', boat.id)
      .where('instrumentKey', 'house')
    assert.equal(created[0].name, 'Servitude (BMV-712)')
    const tank = await BoatTank.query().where('boatId', boat.id).firstOrFail()
    assert.deepEqual([tank.type, tank.instrumentKey], ['fuel', 'fuel.0'])
  })

  test('échec partiel : rien n’est écrit (clé déjà prise)', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, instrumentKey: null }).create()
    await BoatBatteryFactory.merge({ boatId: boat.id, instrumentKey: 'house' }).create()

    const response = await client
      .post(`/boats/${boat.id}/instrument-mapping/apply`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({
        items: [
          item({ kind: 'engine', instrumentKey: 'port', name: 'Bâbord', existingId: engine.id }),
          item({ kind: 'tank', instrumentKey: 'fuel.0', name: 'Gasoil', tankType: 'fuel' }),
          // Échoue en dernier : la clé `house` est déjà portée par une batterie.
          item({ instrumentKey: 'house' }),
        ],
      })
      .redirects(0)

    response.assertStatus(302)
    assert.exists(response.flashMessages().error)
    const fresh2 = await BoatEngine.findOrFail(engine.id)
    assert.isNull(fresh2.instrumentKey)
    assert.lengthOf(await BoatTank.query().where('boatId', boat.id), 0)
    assert.lengthOf(await BoatBattery.query().where('boatId', boat.id), 1)
  })

  test('refuse un moteur sans équipement cible, un type de cuve inconnu ou un doublon', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const url = `/boats/${boat.id}/instrument-mapping/apply`
    const send = (items: unknown[]) =>
      client
        .post(url)
        .loginAs(admin)
        .header('referer', `/boats/${boat.id}`)
        .json({ items })
        .redirects(0)

    const noEngine = await send([item({ kind: 'engine', instrumentKey: 'port' })])
    const badTank = await send([
      item({ kind: 'tank', instrumentKey: 'mystery.0', tankType: 'mystery' }),
    ])
    const dup = await send([item({}), item({})])

    for (const response of [noEngine, badTank, dup]) {
      assert.exists(response.flashMessages().error)
    }
    assert.lengthOf(await BoatBattery.query().where('boatId', boat.id), 0)
    assert.lengthOf(await BoatTank.query().where('boatId', boat.id), 0)
  })

  test('ne touche pas un équipement d’un autre bateau', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const other = await boatWithSource(admin, false)
    const foreign = await BoatBatteryFactory.merge({ boatId: other.boat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/instrument-mapping/apply`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({ items: [item({ existingId: foreign.id })] })
      .redirects(0)

    assert.exists(response.flashMessages().error)
    const fresh3 = await BoatBattery.findOrFail(foreign.id)
    assert.isNull(fresh3.instrumentKey)
  })

  test('refusé sans boats.edit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const { boat } = await boatWithSource(admin, false)

    const response = await client
      .post(`/boats/${boat.id}/instrument-mapping/apply`)
      .loginAs(owner)
      .header('referer', `/boats/${boat.id}`)
      .json({ items: [item({})] })
      .redirects(0)

    response.assertStatus(302)
    assert.isUndefined(response.flashMessages().success)
    assert.lengthOf(await BoatBattery.query().where('boatId', boat.id), 0)
  })

  test('la fiche bateau expose batteries, cuves et propositions dérivées de l’inventaire', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    await BoatInstrumentDevice.create({
      sourceId: source!.id,
      deviceId: 'dev-1',
      label: 'Victron BMV-712',
      bus: 'n2k',
      paths: ['electrical.batteries.house.voltage', 'tanks.fuel.0.currentLevel'],
      manufacturer: 'Victron',
      model: 'BMV-712',
      firstSeenAt: DateTime.now(),
      lastSeenAt: DateTime.now(),
    })
    await BoatBatteryFactory.merge({ boatId: boat.id, name: 'Propulseur' }).create()

    const page = await client
      .get(`/boats/${boat.id}`)
      .loginAs(admin)
      .withInertia()
      .header('X-Inertia-Partial-Component', 'boats/show')
      .header('X-Inertia-Partial-Data', 'batteries,tanks,mappingProposals')

    const props = page.inertiaProps as {
      batteries: Array<{ name: string }>
      tanks: unknown[]
      mappingProposals: { proposals: Array<{ kind: string; instrumentKey: string }> }
    }
    assert.deepEqual(
      props.batteries.map((b) => b.name),
      ['Propulseur']
    )
    assert.deepEqual(
      props.mappingProposals.proposals.map((p) => `${p.kind}:${p.instrumentKey}`),
      ['battery:house', 'tank:fuel.0']
    )
  })
})
