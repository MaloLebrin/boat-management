import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import InstrumentAlertService from '#services/instrument_alert_service'
import { BoatTelemetrySampleFactory } from '#database/factories/boat_telemetry_sample_factory'
import SendPushNotification from '#jobs/send_push_notification'
import BoatInstrumentAlert from '#models/boat_instrument_alert'
import Notification from '#models/notification'
import NotificationPreference from '#models/notification_preference'
import type Boat from '#models/boat'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import type User from '#models/user'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'
import { boatWithSource } from '#tests/functional/instruments/helpers'
import { BoatInstrumentAlertRuleFactory } from '#database/factories/boat_instrument_alert_rule_factory'

/**
 * Alertes des instruments (#993) : le contrôleur d'ingestion émet
 * `TelemetryIngested`, le listener évalue les règles, ouvre ou lève l'alerte
 * et notifie l'équipe. Aucun fake d'émetteur : chemin complet.
 */

const SOC = 'electrical.batteries.house.capacity.stateOfCharge'
const originalDispatch = SendPushNotification.dispatch.bind(SendPushNotification)

let counter = 0
let minutes = 0

function nextAt() {
  minutes += 1
  // Chaque lot est plus récent que le précédent : l'évaluation lit la dernière valeur.
  return DateTime.now()
    .minus({ minutes: 120 - minutes })
    .startOf('second')
    .toUTC()
    .toISO()!
}

async function post(
  client: any,
  admin: User,
  boat: Boat,
  source: BoatInstrumentSource,
  samples: Array<Record<string, unknown>>
) {
  counter += 1
  const response = await client
    .post(`/boats/${boat.id}/telemetry`)
    .loginAs(admin)
    .header('referer', `/boats/${boat.id}`)
    .json({ sourceId: source.id, batchId: `alert-${counter}`, samples })
    .redirects(0)
  response.assertStatus(302)
}

const numeric = (path: string, value: number) => ({ path, recordedAt: nextAt(), value })

function capturePushes(): Array<{ userId: number; type: string }> {
  const pushed: Array<{ userId: number; type: string }> = []
  SendPushNotification.dispatch = (async (payload: { userId: number; type: string }) => {
    pushed.push({ userId: payload.userId, type: payload.type })
  }) as unknown as typeof SendPushNotification.dispatch
  return pushed
}

async function setup() {
  const admin = await createAdminUser()
  const member = await createMemberUser(admin.organizationId!)
  const { boat, source } = await boatWithSource(admin)
  return { admin, member, boat, source: source! }
}

test.group('Instruments — évaluation des alertes (#993)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => {
    SendPushNotification.dispatch = originalDispatch
  })

  test('règles carburant, tension, huile et régime : alertes ouvertes puis levées', async ({
    client,
    assert,
  }) => {
    capturePushes()
    const { admin, boat, source } = await setup()
    const fuel = 'tanks.fuel.main.currentLevel'
    const volt = 'electrical.batteries.house.voltage'
    const oil = 'propulsion.port.oilPressure'
    const rev = 'propulsion.port.revolutions'

    await post(client, admin, boat, source, [
      numeric(fuel, 0.1),
      numeric(volt, 11.5),
      numeric(oil, 50_000),
      numeric(rev, 4000 / 60),
    ])
    const opened = await BoatInstrumentAlert.query().where('boatId', boat.id).whereNull('clearedAt')
    assert.sameMembers(
      opened.map((a) => a.ruleKey),
      [
        'builtin:fuel_low',
        'builtin:battery_voltage_low',
        'builtin:oil_pressure_low',
        'builtin:engine_overrev',
      ]
    )

    await post(client, admin, boat, source, [
      numeric(fuel, 0.4),
      numeric(volt, 12.8),
      numeric(oil, 300_000),
      numeric(rev, 2000 / 60),
    ])
    const stillOpen = await BoatInstrumentAlert.query()
      .where('boatId', boat.id)
      .whereNull('clearedAt')
    assert.lengthOf(stillOpen, 0)
  })

  test('règle intégrée → alerte ouverte → notification et push à l’équipe', async ({
    client,
    assert,
  }) => {
    const pushed = capturePushes()
    const { admin, member, boat, source } = await setup()

    await post(client, admin, boat, source, [numeric(SOC, 0.1)])

    const alert = await BoatInstrumentAlert.query().where('boatId', boat.id).firstOrFail()
    assert.equal(alert.ruleKey, 'builtin:battery_low')
    assert.equal(alert.path, SOC)
    assert.equal(alert.severity, 'warning')
    assert.isNull(alert.clearedAt)
    assert.equal(Number(alert.lastValue), 0.1)
    assert.isNull(alert.ruleId)

    const rows = await Notification.query().where('type', 'instrument.alert_opened')
    assert.sameMembers(
      rows.map((row) => row.userId),
      [admin.id, member.id]
    )
    assert.equal(rows[0].severity, 'warning')
    assert.equal(rows[0].actionUrl, `/boats/${boat.id}?tab=instruments`)
    assert.include(rows[0].title, boat.name)
    assert.sameMembers(
      pushed.map((p) => p.userId),
      [admin.id, member.id]
    )
    assert.isTrue(pushed.every((p) => p.type === 'instrument.alert_opened'))
  })

  test('maintenue sans doublon, puis levée au-delà de l’hystérésis', async ({ client, assert }) => {
    const pushed = capturePushes()
    const { admin, boat, source } = await setup()

    await post(client, admin, boat, source, [numeric(SOC, 0.1)])
    await post(client, admin, boat, source, [numeric(SOC, 0.12)])
    await post(client, admin, boat, source, [numeric(SOC, 0.22)]) // dans la marge de 0,05

    let alerts = await BoatInstrumentAlert.query().where('boatId', boat.id)
    assert.lengthOf(alerts, 1)
    assert.isNull(alerts[0].clearedAt)
    assert.equal(
      await Notification.query()
        .where('type', 'instrument.alert_opened')
        .count('* as n')
        .then((r) => Number(r[0].$extras.n)),
      2 // admin + member, une fois chacun : le maintien n'en renvoie pas
    )
    pushed.length = 0

    await post(client, admin, boat, source, [numeric(SOC, 0.4)])

    alerts = await BoatInstrumentAlert.query().where('boatId', boat.id)
    assert.lengthOf(alerts, 1)
    assert.isNotNull(alerts[0].clearedAt)
    const cleared = await Notification.query().where('type', 'instrument.alert_cleared')
    assert.isAbove(cleared.length, 0)
    assert.equal(cleared[0].severity, 'success')
    assert.isEmpty(pushed, 'la levée reste in-app')
  })

  test('une alerte levée se rouvre à la prochaine violation', async ({ client, assert }) => {
    capturePushes()
    const { admin, boat, source } = await setup()
    await post(client, admin, boat, source, [numeric(SOC, 0.1)])
    await post(client, admin, boat, source, [numeric(SOC, 0.5)])
    await post(client, admin, boat, source, [numeric(SOC, 0.05)])

    const alerts = await BoatInstrumentAlert.query().where('boatId', boat.id).orderBy('id')
    assert.lengthOf(alerts, 2)
    assert.isNotNull(alerts[0].clearedAt)
    assert.isNull(alerts[1].clearedAt)
  })

  test('un lot rejoué n’ouvre rien de plus', async ({ client, assert }) => {
    capturePushes()
    const { admin, boat, source } = await setup()
    const sample = numeric(SOC, 0.1)
    await post(client, admin, boat, source, [sample])
    await post(client, admin, boat, source, [sample])

    const total = await BoatInstrumentAlert.query().where('boatId', boat.id).count('* as n')
    assert.equal(Number(total[0].$extras.n), 1)
    const notifications = await Notification.query().where('type', 'instrument.alert_opened')
    assert.lengthOf(notifications, 2)
  })

  test('une alarme Signal K « alarm » ouvre une alerte critique, « normal » la lève', async ({
    client,
    assert,
  }) => {
    capturePushes()
    const { admin, boat, source } = await setup()
    const path = 'notifications.navigation.anchor'

    await post(client, admin, boat, source, [
      { path, recordedAt: nextAt(), valueJson: { state: 'alarm', message: 'Anchor drag' } },
    ])
    let alert = await BoatInstrumentAlert.query().where('boatId', boat.id).firstOrFail()
    assert.equal(alert.ruleKey, 'builtin:signalk_alarm')
    assert.equal(alert.severity, 'critical')
    assert.equal(alert.message, 'Anchor drag')
    const opened = await Notification.query().where('type', 'instrument.alert_opened')
    assert.equal(opened[0].severity, 'error')
    assert.include(opened[0].title, 'Anchor drag')

    await post(client, admin, boat, source, [
      { path, recordedAt: nextAt(), valueJson: { state: 'normal' } },
    ])
    alert = await BoatInstrumentAlert.findOrFail(alert.id)
    assert.isNotNull(alert.clearedAt)
  })

  test('une règle de l’admin s’évalue en SI et porte son id', async ({ client, assert }) => {
    capturePushes()
    const { admin, boat, source } = await setup()
    const path = 'environment.water.temperature'
    await client
      .post(`/boats/${boat.id}/instrument-alert-rules`)
      .loginAs(admin)
      .json({ path, operator: 'gt', threshold: 30, hysteresis: 2, severity: 'critical' })
      .redirects(0)

    await post(client, admin, boat, source, [numeric(path, 295.15)]) // 22 °C
    assert.isNull(await BoatInstrumentAlert.query().where('boatId', boat.id).first())
    await post(client, admin, boat, source, [numeric(path, 304.15)]) // 31 °C

    const alert = await BoatInstrumentAlert.query().where('boatId', boat.id).firstOrFail()
    assert.match(alert.ruleKey, /^rule:\d+$/)
    assert.isNotNull(alert.ruleId)
    assert.equal(alert.severity, 'critical')
    const opened = await Notification.query().where('type', 'instrument.alert_opened')
    assert.include(opened[0].title, path)
  })

  test('une règle désactivée n’alerte pas', async ({ client, assert }) => {
    capturePushes()
    const { admin, boat, source } = await setup()
    await BoatInstrumentAlertRuleFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      path: 'electrical.batteries.house.current',
      operator: 'lt',
      threshold: '12.0000',
      enabled: false,
    }).create()

    await post(client, admin, boat, source, [numeric('electrical.batteries.house.current', 11)])
    assert.isNull(await BoatInstrumentAlert.query().where('boatId', boat.id).first())
  })

  test('l’alerte d’un bateau n’en touche pas un autre', async ({ client, assert }) => {
    capturePushes()
    const { admin, boat, source } = await setup()
    const second = await boatWithSource(admin)

    await post(client, admin, boat, source, [numeric(SOC, 0.1)])

    const forSecond = await BoatInstrumentAlert.query().where('boatId', second.boat.id)
    assert.isEmpty(forSecond)
  })

  test('un destinataire qui coupe la famille « flotte » ne reçoit rien', async ({
    client,
    assert,
  }) => {
    capturePushes()
    const { admin, member, boat, source } = await setup()
    await NotificationPreference.create({
      userId: member.id,
      family: 'fleet',
      inApp: false,
      push: false,
      email: false,
    })

    await post(client, admin, boat, source, [numeric(SOC, 0.1)])

    const visible = await Notification.query()
      .where('type', 'instrument.alert_opened')
      .where('inApp', true)
    assert.deepEqual(
      visible.map((row) => row.userId),
      [admin.id]
    )
  })

  test('deux évaluations simultanées n’ouvrent qu’une alerte', async ({ assert }) => {
    capturePushes()
    const { boat, source } = await setup()
    await BoatTelemetrySampleFactory.merge({
      boatId: boat.id,
      sourceId: source.id,
      path: SOC,
      recordedAt: DateTime.now().minus({ minutes: 1 }),
      value: '0.1000',
    }).create()
    const service = await app.container.make(InstrumentAlertService)

    await Promise.all([service.evaluate(source, [SOC]), service.evaluate(source, [SOC])])

    const total = await BoatInstrumentAlert.query().where('boatId', boat.id).count('* as n')
    assert.equal(Number(total[0].$extras.n), 1)
  })

  test('evaluate sans chemin ne fait rien', async ({ assert }) => {
    const { source } = await setup()
    const service = await app.container.make(InstrumentAlertService)
    assert.deepEqual(await service.evaluate(source, []), [])
  })
})
