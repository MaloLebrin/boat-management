import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import BoatAisSighting from '#models/boat_ais_sighting'
import TelemetryRetentionService from '#services/telemetry_retention_service'
import PurgeTelemetrySamples from '#jobs/purge_telemetry_samples'
import { BoatAisSightingFactory } from '#database/factories/boat_ais_sighting_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatInstrumentSourceFactory } from '#database/factories/boat_instrument_source_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { AIS_SIGHTING_RETENTION_DAYS } from '#shared/constants/data_retention'
import type { PlanTier } from '#shared/types/plan'

/**
 * Purge des cibles AIS (#1009) — le même cron que les relevés (#992). La
 * rétention AIS est bien plus courte (1/7/30 j selon le plan) ; trop purger
 * efface des données récentes, pas assez conserve des données de tiers.
 */

async function boatOfPlan(plan: PlanTier) {
  const organization = await OrganizationFactory.merge({ plan }).create()
  const boat = await BoatFactory.merge({ organizationId: organization.id }).create()
  const source = await BoatInstrumentSourceFactory.merge({
    boatId: boat.id,
    organizationId: organization.id,
    baseUrl: `https://signalk-${plan}.example:3443`,
  }).create()
  return { boat, source }
}

async function seedAis(
  boat: { id: number },
  source: { id: number },
  daysAgo: number,
  mmsi = '244630000'
) {
  return BoatAisSightingFactory.merge({
    boatId: boat.id,
    sourceId: source.id,
    mmsi,
    recordedAt: DateTime.now().minus({ days: daysAgo }),
  }).create()
}

async function purge() {
  const job = await app.container.make(PurgeTelemetrySamples)
  await job.execute()
}

async function remainingAis(boatId: number) {
  const rows = await BoatAisSighting.query().where('boatId', boatId)
  return rows.map((row) => row.id)
}

test.group('PurgeTelemetrySamples — purge AIS par plan', () => {
  test('coupe les relevés AIS à la rétention de chaque plan', async ({ assert }) => {
    const pro = await boatOfPlan('pro')
    const enterprise = await boatOfPlan('enterprise')
    const starter = await boatOfPlan('starter')

    const proDays = AIS_SIGHTING_RETENTION_DAYS.pro
    const enterpriseDays = AIS_SIGHTING_RETENTION_DAYS.enterprise
    const starterDays = AIS_SIGHTING_RETENTION_DAYS.starter

    // Pro : un trop vieux, un dans la fenêtre
    await seedAis(pro.boat, pro.source, proDays + 1, '111111111')
    const proKept = await seedAis(pro.boat, pro.source, proDays - 1, '222222222')

    // Enterprise : garde un relevé plus vieux que Pro mais dans sa fenêtre
    const enterpriseKept = await seedAis(
      enterprise.boat,
      enterprise.source,
      proDays + 1,
      '333333333'
    )
    await seedAis(enterprise.boat, enterprise.source, enterpriseDays + 1, '444444444')

    // Starter : un trop vieux, un récent
    await seedAis(starter.boat, starter.source, starterDays + 1, '555555555')
    const starterKept = await seedAis(starter.boat, starter.source, 0, '666666666')

    await purge()

    assert.deepEqual(await remainingAis(pro.boat.id), [proKept.id])
    assert.deepEqual(await remainingAis(enterprise.boat.id), [enterpriseKept.id])
    assert.deepEqual(await remainingAis(starter.boat.id), [starterKept.id])
  })

  test('ne supprime pas un relevé AIS encore dans la fenêtre', async ({ assert }) => {
    const pro = await boatOfPlan('pro')
    const recent1 = await seedAis(pro.boat, pro.source, 1, '111111111')
    const recent2 = await seedAis(pro.boat, pro.source, 2, '222222222')

    await purge()

    assert.sameMembers(await remainingAis(pro.boat.id), [recent1.id, recent2.id])
  })

  test('retourne le nombre de lignes AIS supprimées', async ({ assert }) => {
    const pro = await boatOfPlan('pro')
    await seedAis(pro.boat, pro.source, AIS_SIGHTING_RETENTION_DAYS.pro + 1, '111111111')
    await seedAis(pro.boat, pro.source, AIS_SIGHTING_RETENTION_DAYS.pro + 2, '222222222')
    await seedAis(pro.boat, pro.source, 1, '333333333')

    const deleted = await new TelemetryRetentionService().purgeExpired()

    // Deux AIS expirés ; les mesures sont toutes récentes.
    assert.isAtLeast(deleted, 2)
  })
})
