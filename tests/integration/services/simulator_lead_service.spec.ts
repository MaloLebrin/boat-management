import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import SimulatorLeadService from '#services/simulator_lead_service'
import SimulatorLead from '#models/simulator_lead'
import { SimulatorLeadFactory } from '#database/factories/simulator_lead_factory'
import type { SimulatorLeadPayload } from '#shared/types/simulator'

const basePayload: SimulatorLeadPayload = {
  email: 'skipper@example.com',
  boatType: 'sailboat',
  lengthM: 10,
  hullWear: 'good',
  safetyWear: 'good',
  riggingWear: 'worn',
  totalMin: 3000,
  totalMax: 5000,
  locale: 'fr',
}

test.group('SimulatorLeadService (unit)', (group) => {
  group.each.setup(async () => {
    await SimulatorLead.query().delete()
    mail.fake()
  })
  group.each.teardown(() => mail.restore())

  // ── create ───────────────────────────────────────────────────────────────

  test('create avec payload valide stocke le lead en DB', async ({ assert }) => {
    const svc = new SimulatorLeadService()
    const lead = await svc.create(basePayload)

    assert.isString(lead.id)
    const found = await SimulatorLead.findBy('email', basePayload.email)
    assert.isNotNull(found)
    assert.equal(found!.boatType, 'sailboat')
    assert.equal(found!.totalMin, 3000)
    assert.equal(found!.totalMax, 5000)
    assert.equal(found!.locale, 'fr')
  })

  test('create avec même email upsert le lead existant sans doublon', async ({ assert }) => {
    const svc = new SimulatorLeadService()
    await svc.create(basePayload)
    await svc.create({ ...basePayload, totalMin: 4000, totalMax: 7000 })

    const leads = await SimulatorLead.query().where('email', basePayload.email)
    assert.lengthOf(leads, 1)
    assert.equal(leads[0]!.totalMin, 4000)
    assert.equal(leads[0]!.totalMax, 7000)
  })

  test('create sans winteringZone stocke winteringZone null en DB', async ({ assert }) => {
    const payloadWithoutWintering = { ...basePayload, email: 'nowintering@example.com' }

    const svc = new SimulatorLeadService()
    const lead = await svc.create(payloadWithoutWintering)

    assert.isNull(lead.winteringZone)
    const found = await SimulatorLead.findBy('email', 'nowintering@example.com')
    assert.isNull(found!.winteringZone)
  })

  test('create avec winteringZone stocke la valeur en DB', async ({ assert }) => {
    const svc = new SimulatorLeadService()
    const lead = await svc.create({
      ...basePayload,
      email: 'withwintering@example.com',
      winteringZone: 'covered',
    })

    assert.equal(lead.winteringZone, 'covered')
  })

  test('create avec winteringZone undefined stocke null en DB', async ({ assert }) => {
    const svc = new SimulatorLeadService()
    const lead = await svc.create({
      ...basePayload,
      email: 'undefined-wintering@example.com',
      winteringZone: undefined,
    })

    assert.isNull(lead.winteringZone)
  })

  // ── getBenchmarks ────────────────────────────────────────────────────────

  test('getBenchmarks retourne une map vide quand moins de 10 simulations', async ({ assert }) => {
    // 9 leads → en dessous du seuil HAVING COUNT(*) >= 10
    await SimulatorLeadFactory.merge({
      boatType: 'sailboat',
      lengthM: 10,
    }).createMany(9)

    const svc = new SimulatorLeadService()
    const benchmarks = await svc.getBenchmarks()

    assert.deepEqual(benchmarks, {})
  })

  test('getBenchmarks retourne les données agrégées quand 10+ simulations existent', async ({
    assert,
  }) => {
    // 10 leads identiques pour déclencher le seuil
    await SimulatorLeadFactory.merge({
      boatType: 'motorboat',
      lengthM: 7, // bracket '6-9'
      totalMin: 1000,
      totalMax: 2000,
    }).createMany(10)

    const svc = new SimulatorLeadService()
    const benchmarks = await svc.getBenchmarks()

    const key = 'motorboat:6-9'
    assert.property(benchmarks, key)
    assert.equal(benchmarks[key]!.count, 10)
    assert.isNumber(benchmarks[key]!.avgMin)
    assert.isNumber(benchmarks[key]!.avgMax)
  })
})
