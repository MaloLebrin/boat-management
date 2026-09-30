import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import { withTrashed } from '#models/mixins/soft_deletes'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import PurgeTrashedBoats from '#jobs/purge_trashed_boats'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'

/**
 * Purge de la corbeille — cron quotidien 04:15 (#858).
 *
 * Deux façons de se tromper :
 * - purger trop tôt ⇒ une restauration encore possible est détruite ;
 * - ne pas purger ⇒ les bateaux et leurs médias restent sans limite.
 */
test.group('PurgeTrashedBoats (cron 04:15)', (group) => {
  group.each.setup(() => swapFakeCloudinary())
  group.each.teardown(() => restoreCloudinary())

  test('deletes boats trashed for more than 30 days and keeps the recent ones', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const recent = await BoatFactory.merge({ organizationId: org.id }).create()
    const old = await BoatFactory.merge({ organizationId: org.id }).create()
    recent.deletedAt = DateTime.now().minus({ days: 10 })
    old.deletedAt = DateTime.now().minus({ days: 31 })
    await recent.save()
    await old.save()

    const job = await app.container.make(PurgeTrashedBoats)
    await job.execute()

    assert.isNotNull(await withTrashed(Boat.query().where('id', recent.id)).first())
    assert.isNull(await withTrashed(Boat.query().where('id', old.id)).first())
  })
})
