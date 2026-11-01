import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatBattery from '#models/boat_battery'
import BoatTank from '#models/boat_tank'
import BoatInstrumentAlertRule from '#models/boat_instrument_alert_rule'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'
import { boatWithSource } from '#tests/functional/instruments/helpers'
import { BoatBatteryFactory } from '#database/factories/boat_battery_factory'
import { BoatTankFactory } from '#database/factories/boat_tank_factory'

/** Batteries et réservoirs (#1037) : CRUD, unicité de la clé, seuils liés, droits. */

test.group('Batteries — CRUD', (group) => {
  group.each.setup(() => truncateDb())

  test('crée une batterie avec sa clé, ordonnée par position', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)

    for (const name of ['Servitude', 'Démarrage']) {
      const response = await client
        .post(`/boats/${boat.id}/batteries`)
        .loginAs(admin)
        .header('referer', `/boats/${boat.id}`)
        .json({ name, instrumentKey: name === 'Servitude' ? ' house ' : null })
        .redirects(0)
      response.assertStatus(302)
      assert.exists(response.flashMessages().success)
    }

    const rows = await BoatBattery.query().where('boatId', boat.id).orderBy('position')
    assert.deepEqual(
      rows.map((b) => [b.name, b.instrumentKey, b.position]),
      [
        ['Servitude', 'house', 0],
        ['Démarrage', null, 1],
      ]
    )
  })

  test('refuse une clé déjà prise (création, modification, PATCH) mais pas la sienne', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    await BoatBatteryFactory.merge({ boatId: boat.id, instrumentKey: 'house' }).create()
    const second = await BoatBatteryFactory.merge({
      boatId: boat.id,
      instrumentKey: 'start',
    }).create()
    const url = `/boats/${boat.id}/batteries`

    const created = await client
      .post(url)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({ name: 'Autre', instrumentKey: 'house' })
      .redirects(0)
    assert.exists(created.flashMessages().error)

    const updated = await client
      .put(`${url}/${second.id}`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({ name: 'Démarrage', instrumentKey: 'house' })
      .redirects(0)
    assert.exists(updated.flashMessages().error)

    const patched = await client
      .patch(`${url}/${second.id}/instrument-key`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({ instrumentKey: 'house' })
      .redirects(0)
    assert.exists(patched.flashMessages().error)

    const own = await client
      .put(`${url}/${second.id}`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({ name: 'Démarrage 2', instrumentKey: 'start' })
      .redirects(0)
    assert.exists(own.flashMessages().success)

    const count = await BoatBattery.query().where('boatId', boat.id).count('* as n')
    assert.equal(Number(count[0].$extras.n), 2)
    const fresh1 = await BoatBattery.findOrFail(second.id)
    assert.equal(fresh1.name, 'Démarrage 2')
  })

  test('PATCH instrument-key relie puis détache', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const battery = await BoatBatteryFactory.merge({ boatId: boat.id }).create()
    const url = `/boats/${boat.id}/batteries/${battery.id}/instrument-key`

    await client.patch(url).loginAs(admin).json({ instrumentKey: 'house' }).redirects(0)
    const fresh2 = await BoatBattery.findOrFail(battery.id)
    assert.equal(fresh2.instrumentKey, 'house')

    await client.patch(url).loginAs(admin).json({ instrumentKey: null }).redirects(0)
    const fresh3 = await BoatBattery.findOrFail(battery.id)
    assert.isNull(fresh3.instrumentKey)
  })

  test('refuse une clé qui n’est pas un segment de chemin', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)

    await client
      .post(`/boats/${boat.id}/batteries`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({ name: 'X', instrumentKey: 'house.main' })
      .redirects(0)

    assert.lengthOf(await BoatBattery.query().where('boatId', boat.id), 0)
  })

  test('le seuil crée la règle d’alerte liée, la suit et disparaît avec la batterie', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const url = `/boats/${boat.id}/batteries`

    await client
      .post(url)
      .loginAs(admin)
      .json({ name: 'Servitude', instrumentKey: 'house', lowVoltageV: 12.2 })
      .redirects(0)
    const battery = await BoatBattery.query().where('boatId', boat.id).firstOrFail()
    let rule = await BoatInstrumentAlertRule.query().where('batteryId', battery.id).firstOrFail()
    assert.equal(rule.path, 'electrical.batteries.house.voltage')
    assert.equal(Number(rule.threshold), 12.2)

    // La règle suit la clé.
    await client
      .patch(`${url}/${battery.id}/instrument-key`)
      .loginAs(admin)
      .json({ instrumentKey: 'start' })
      .redirects(0)
    rule = await BoatInstrumentAlertRule.query().where('batteryId', battery.id).firstOrFail()
    assert.equal(rule.path, 'electrical.batteries.start.voltage')

    // Détacher la batterie supprime la règle (plus de chemin à surveiller).
    await client
      .patch(`${url}/${battery.id}/instrument-key`)
      .loginAs(admin)
      .json({ instrumentKey: null })
      .redirects(0)
    assert.isNull(await BoatInstrumentAlertRule.query().where('batteryId', battery.id).first())

    // Relier de nouveau recrée la règle ; supprimer la batterie l’emporte.
    await client
      .patch(`${url}/${battery.id}/instrument-key`)
      .loginAs(admin)
      .json({ instrumentKey: 'house' })
      .redirects(0)
    await client.delete(`${url}/${battery.id}`).loginAs(admin).redirects(0)
    assert.isNull(await BoatBattery.find(battery.id))
    assert.lengthOf(await BoatInstrumentAlertRule.query().where('boatId', boat.id), 0)
  })

  test('une règle manuelle déjà posée sur le chemin n’est pas doublée', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    await BoatInstrumentAlertRule.create({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      path: 'electrical.batteries.house.voltage',
      operator: 'lt',
      threshold: '11.0',
      hysteresis: '0.5',
      severity: 'critical',
      enabled: true,
    })

    await client
      .post(`/boats/${boat.id}/batteries`)
      .loginAs(admin)
      .json({ name: 'Servitude', instrumentKey: 'house', lowVoltageV: 12.2 })
      .redirects(0)

    const rules = await BoatInstrumentAlertRule.query().where('boatId', boat.id)
    assert.lengthOf(rules, 1)
    assert.isNull(rules[0].batteryId)
  })

  test('403 (redirection + flash) pour un membre sans boats.edit, rien n’est écrit', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const { boat } = await boatWithSource(admin, false)
    const battery = await BoatBatteryFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/batteries`)
      .loginAs(owner)
      .header('referer', `/boats/${boat.id}`)
      .json({ name: 'Intruse' })
      .redirects(0)
    response.assertStatus(302)
    assert.isUndefined(response.flashMessages().success)

    await client.delete(`/boats/${boat.id}/batteries/${battery.id}`).loginAs(owner).redirects(0)
    assert.lengthOf(await BoatBattery.query().where('boatId', boat.id), 1)
  })

  test('batterie d’un autre bateau : introuvable', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const other = await boatWithSource(admin, false)
    const battery = await BoatBatteryFactory.merge({ boatId: other.boat.id }).create()

    const response = await client
      .delete(`/boats/${boat.id}/batteries/${battery.id}`)
      .loginAs(admin)
      .redirects(0)

    assert.equal(response.header('location'), `/boats/${boat.id}`)
    assert.exists(await BoatBattery.find(battery.id))
  })
})

test.group('Réservoirs — CRUD', (group) => {
  group.each.setup(() => truncateDb())

  test('crée une cuve, refuse un type inconnu et une clé mal formée', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const url = `/boats/${boat.id}/tanks`
    const send = (body: Record<string, unknown>) =>
      client.post(url).loginAs(admin).header('referer', `/boats/${boat.id}`).json(body).redirects(0)

    await send({ name: 'Gasoil', type: 'fuel', capacityL: 200, instrumentKey: 'fuel.0' })
    await send({ name: 'Mystère', type: 'mystery' })
    await send({ name: 'Mal formée', type: 'fuel', instrumentKey: 'fuel' })

    const rows = await BoatTank.query().where('boatId', boat.id)
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].instrumentKey, 'fuel.0')
    assert.equal(rows[0].capacityL, 200)
  })

  test('refuse une clé déjà prise', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    await BoatTankFactory.merge({ boatId: boat.id, instrumentKey: 'fuel.0' }).create()

    const response = await client
      .post(`/boats/${boat.id}/tanks`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({ name: 'Bis', type: 'fuel', instrumentKey: 'fuel.0' })
      .redirects(0)

    assert.exists(response.flashMessages().error)
    assert.lengthOf(await BoatTank.query().where('boatId', boat.id), 1)
  })

  test('le seuil de niveau bas crée la règle liée (en %), supprimée avec la cuve', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)

    await client
      .post(`/boats/${boat.id}/tanks`)
      .loginAs(admin)
      .json({ name: 'Gasoil', type: 'fuel', instrumentKey: 'fuel.0', lowLevelPct: 20 })
      .redirects(0)
    const tank = await BoatTank.query().where('boatId', boat.id).firstOrFail()
    const rule = await BoatInstrumentAlertRule.query().where('tankId', tank.id).firstOrFail()
    assert.equal(rule.path, 'tanks.fuel.0.currentLevel')
    // Stocké en SI : 20 % = ratio 0.2.
    assert.closeTo(Number(rule.threshold), 0.2, 1e-6)

    await client.delete(`/boats/${boat.id}/tanks/${tank.id}`).loginAs(admin).redirects(0)
    assert.lengthOf(await BoatInstrumentAlertRule.query().where('boatId', boat.id), 0)
  })

  test('403 pour un membre sans boats.edit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const { boat } = await boatWithSource(admin, false)

    await client
      .post(`/boats/${boat.id}/tanks`)
      .loginAs(owner)
      .header('referer', `/boats/${boat.id}`)
      .json({ name: 'Intruse', type: 'fuel' })
      .redirects(0)

    assert.lengthOf(await BoatTank.query().where('boatId', boat.id), 0)
  })
})
