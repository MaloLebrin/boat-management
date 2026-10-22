import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import BoatTelemetrySample from '#models/boat_telemetry_sample'
import TelemetryRetentionService from '#services/telemetry_retention_service'
import PurgeTelemetrySamples from '#jobs/purge_telemetry_samples'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatInstrumentSourceFactory } from '#database/factories/boat_instrument_source_factory'
import { BoatTelemetrySampleFactory } from '#database/factories/boat_telemetry_sample_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { TELEMETRY_SAMPLE_RETENTION_DAYS } from '#shared/constants/data_retention'
import type { PlanTier } from '#shared/types/plan'

/**
 * Purge des relevés d'instruments — cron quotidien 01:15 (#992). La rétention
 * dépend du plan de l'organisation du bateau : trop purger efface un
 * historique payé, trop peu fait grossir la table la plus volumineuse.
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

async function seed(
  boat: { id: number },
  source: { id: number },
  daysAgo: number,
  path = 'navigation.speedOverGround'
) {
  return BoatTelemetrySampleFactory.merge({
    boatId: boat.id,
    sourceId: source.id,
    path,
    recordedAt: DateTime.now().minus({ days: daysAgo }),
  }).create()
}

async function purge() {
  const job = await app.container.make(PurgeTelemetrySamples)
  await job.execute()
}

async function remaining(boatId: number) {
  const rows = await BoatTelemetrySample.query().where('boatId', boatId)
  return rows.map((row) => row.id)
}

test.group('PurgeTelemetrySamples (cron 01:15)', () => {
  test('coupe à la rétention de chaque plan', async ({ assert }) => {
    const pro = await boatOfPlan('pro')
    const enterprise = await boatOfPlan('enterprise')
    const starter = await boatOfPlan('starter')
    const proDays = TELEMETRY_SAMPLE_RETENTION_DAYS.pro
    const enterpriseDays = TELEMETRY_SAMPLE_RETENTION_DAYS.enterprise
    const starterDays = TELEMETRY_SAMPLE_RETENTION_DAYS.starter

    await seed(pro.boat, pro.source, proDays + 1)
    const proKept = await seed(pro.boat, pro.source, proDays - 1)
    const enterpriseKept = await seed(enterprise.boat, enterprise.source, proDays + 100)
    await seed(enterprise.boat, enterprise.source, enterpriseDays + 1)
    await seed(starter.boat, starter.source, starterDays + 1)
    const starterKept = await seed(starter.boat, starter.source, 1)

    await purge()

    assert.deepEqual(await remaining(pro.boat.id), [proKept.id])
    assert.deepEqual(await remaining(enterprise.boat.id), [enterpriseKept.id])
    assert.deepEqual(await remaining(starter.boat.id), [starterKept.id])
  })

  test('ne touche pas un bateau sans relevé expiré', async ({ assert }) => {
    const pro = await boatOfPlan('pro')
    const recent = await seed(pro.boat, pro.source, 2)
    const recentOther = await seed(pro.boat, pro.source, 3, 'navigation.headingTrue')

    await purge()

    assert.sameMembers(await remaining(pro.boat.id), [recent.id, recentOther.id])
  })

  test('retourne le nombre de lignes supprimées', async ({ assert }) => {
    const pro = await boatOfPlan('pro')
    await seed(pro.boat, pro.source, 500)
    await seed(pro.boat, pro.source, 600, 'navigation.headingTrue')
    await seed(pro.boat, pro.source, 1)

    const deleted = await new TelemetryRetentionService().purgeExpired()

    assert.equal(deleted, 2)
  })
})
