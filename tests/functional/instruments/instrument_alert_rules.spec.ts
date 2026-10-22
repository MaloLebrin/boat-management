import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import BoatInstrumentAlert from '#models/boat_instrument_alert'
import BoatInstrumentAlertRule from '#models/boat_instrument_alert_rule'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'
import { asInstrumentsReload, boatWithSource } from '#tests/functional/instruments/helpers'
import { BoatInstrumentAlertFactory } from '#database/factories/boat_instrument_alert_factory'
import { BoatInstrumentAlertRuleFactory } from '#database/factories/boat_instrument_alert_rule_factory'
import { INSTRUMENT_ALERT_MAX_RULES_PER_BOAT } from '#shared/constants/instrument_alerts'
import type { InstrumentsTabProps } from '#shared/types/instruments'

/** Règles d'alerte d'un bateau (#993) : admin seulement, valeurs saisies en unité d'affichage. */

const body = (overrides: Record<string, unknown> = {}) => ({
  path: 'propulsion.port.temperature',
  operator: 'gt',
  threshold: 95,
  hysteresis: 5,
  severity: 'critical',
  ...overrides,
})

test.group('Instruments — règles d’alerte (#993)', (group) => {
  group.each.setup(() => truncateDb())

  test('crée une règle et la stocke en SI', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)

    const response = await client
      .post(`/boats/${boat.id}/instrument-alert-rules`)
      .loginAs(admin)
      .json(body())
      .redirects(0)

    response.assertStatus(302)
    const rule = await BoatInstrumentAlertRule.query().where('boatId', boat.id).firstOrFail()
    assert.closeTo(Number(rule.threshold), 368.15, 1e-4)
    assert.closeTo(Number(rule.hysteresis), 5, 1e-4)
    assert.equal(rule.operator, 'gt')
    assert.equal(rule.severity, 'critical')
    assert.isTrue(rule.enabled)
    assert.equal(rule.organizationId, admin.organizationId)
  })

  test('refuse un chemin hors catalogue ou non numérique', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)

    for (const path of ['navigation.position', 'unknown.path', 'notifications.fire']) {
      const response = await client
        .post(`/boats/${boat.id}/instrument-alert-rules`)
        .loginAs(admin)
        .header('referer', `/boats/${boat.id}`)
        .json(body({ path }))
        .redirects(0)
      response.assertStatus(302)
      assert.exists(response.flashMessages().error, path)
    }
    assert.isNull(await BoatInstrumentAlertRule.query().where('boatId', boat.id).first())
  })

  test('refuse un doublon chemin + opérateur, mais accepte l’autre opérateur', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const url = `/boats/${boat.id}/instrument-alert-rules`
    await client.post(url).loginAs(admin).json(body()).redirects(0)

    const duplicate = await client
      .post(url)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json(body({ threshold: 100 }))
      .redirects(0)
    assert.exists(duplicate.flashMessages().error)

    await client
      .post(url)
      .loginAs(admin)
      .json(body({ operator: 'lt', threshold: 5 }))
      .redirects(0)
    const count = await BoatInstrumentAlertRule.query().where('boatId', boat.id).count('* as n')
    assert.equal(Number(count[0].$extras.n), 2)
  })

  test('plafonne le nombre de règles par bateau', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    for (let index = 0; index < INSTRUMENT_ALERT_MAX_RULES_PER_BOAT; index += 1) {
      await BoatInstrumentAlertRuleFactory.merge({
        boatId: boat.id,
        organizationId: admin.organizationId!,
        path: `propulsion.e${index}.temperature`,
      }).create()
    }

    const response = await client
      .post(`/boats/${boat.id}/instrument-alert-rules`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json(body())
      .redirects(0)

    assert.exists(response.flashMessages().error)
    const count = await BoatInstrumentAlertRule.query().where('boatId', boat.id).count('* as n')
    assert.equal(Number(count[0].$extras.n), INSTRUMENT_ALERT_MAX_RULES_PER_BOAT)
  })

  test('modifier une règle ferme ses alertes ouvertes', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const rule = await BoatInstrumentAlertRuleFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      path: 'propulsion.port.temperature',
      operator: 'gt',
    }).create()
    const alert = await BoatInstrumentAlertFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      ruleId: rule.id,
      ruleKey: `rule:${rule.id}`,
      path: rule.path,
    }).create()

    await client
      .put(`/boats/${boat.id}/instrument-alert-rules/${rule.id}`)
      .loginAs(admin)
      .json(body({ enabled: false }))
      .redirects(0)

    const updated = await BoatInstrumentAlertRule.findOrFail(rule.id)
    assert.isFalse(updated.enabled)
    assert.closeTo(Number(updated.threshold), 368.15, 1e-4)
    const closed = await BoatInstrumentAlert.findOrFail(alert.id)
    assert.isNotNull(closed.clearedAt)
  })

  test('supprime la règle et ses alertes, jamais celle d’un autre bateau', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const other = await boatWithSource(admin)
    const rule = await BoatInstrumentAlertRuleFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
    }).create()
    await BoatInstrumentAlertFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      ruleId: rule.id,
      ruleKey: `rule:${rule.id}`,
      path: rule.path,
    }).create()

    const foreign = await client
      .delete(`/boats/${other.boat.id}/instrument-alert-rules/${rule.id}`)
      .loginAs(admin)
      .header('referer', `/boats/${other.boat.id}`)
      .redirects(0)
    assert.exists(foreign.flashMessages().error)
    assert.isNotNull(await BoatInstrumentAlertRule.find(rule.id))

    await client
      .delete(`/boats/${boat.id}/instrument-alert-rules/${rule.id}`)
      .loginAs(admin)
      .redirects(0)
    assert.isNull(await BoatInstrumentAlertRule.find(rule.id))
    assert.isNull(await BoatInstrumentAlert.query().where('boatId', boat.id).first())
  })

  test('un member est refusé et rien n’est écrit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const { boat } = await boatWithSource(admin)

    await client
      .post(`/boats/${boat.id}/instrument-alert-rules`)
      .loginAs(member)
      .json(body())
      .redirects(0)

    assert.isNull(await BoatInstrumentAlertRule.query().where('boatId', boat.id).first())
  })

  test('le bateau d’une autre organisation est introuvable', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const { boat } = await boatWithSource(other)

    await client
      .post(`/boats/${boat.id}/instrument-alert-rules`)
      .loginAs(admin)
      .json(body())
      .redirects(0)

    assert.isNull(await BoatInstrumentAlertRule.query().where('boatId', boat.id).first())
  })

  test('la prop différée expose règles et alertes ouvertes, pas les alertes levées', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const rule = await BoatInstrumentAlertRuleFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
    }).create()
    await BoatInstrumentAlertFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      ruleKey: 'builtin:battery_low',
      path: 'electrical.batteries.house.capacity.stateOfCharge',
      lastValue: '0.1000',
    }).create()
    await BoatInstrumentAlertFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      ruleKey: 'builtin:shallow_water',
      path: 'environment.depth.belowKeel',
      clearedAt: DateTime.now(),
    }).create()

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin))
    response.assertStatus(200)
    const props = response.inertiaProps.instruments as InstrumentsTabProps

    assert.deepEqual(
      props.rules.map((row) => row.id),
      [rule.id]
    )
    assert.closeTo(props.rules[0].threshold, 12, 1e-6)
    assert.lengthOf(props.openAlerts, 1)
    assert.equal(props.openAlerts[0].ruleKey, 'builtin:battery_low')
    assert.equal(props.openAlerts[0].lastValue, 0.1)
  })
})
