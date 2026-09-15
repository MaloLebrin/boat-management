import Boat from '#models/boat'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import Notification from '#models/notification'
import Organization from '#models/organization'
import Port from '#models/port'
import User from '#models/user'
import BillingModuleStatesSeeder from '#database/seeders/billing_module_states_seeder'
import MaloSeeder from '#database/seeders/malo_seeder'
import SandboxSeeder from '#database/seeders/sandbox_seeder'
import TestPlansSeeder from '#database/seeders/test_plans_seeder'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

/**
 * The `ADMIN_EMAIL` account is the app owner's REAL account, not a test one.
 * Only `malo_seeder.ts` may write to it, and its organization must hold exactly
 * one boat ("3D") on the `pro` plan, and no port data (marina mapping is an
 * Enterprise feature). This guards against a future seeder
 * quietly hanging fabricated data off it.
 */
const ADMIN_EMAIL = 'seed-admin@test.local'
const ADMIN_PASSWORD = 'Password1!'

/**
 * Seeders are instantiated directly rather than run through `ace db:seed`:
 * it keeps the run inside the suite's global transaction and bypasses the
 * `static environment` restriction of the two test-only seeders.
 */
function client(): QueryClientContract {
  return db.connection() as QueryClientContract
}

async function adminOrganization(): Promise<{ user: User; organization: Organization }> {
  const user = await User.query().where('email', ADMIN_EMAIL).firstOrFail()
  const organization = await Organization.findOrFail(user.organizationId!)
  return { user, organization }
}

test.group('Seeders — admin account isolation', (group) => {
  let previousEmail: string | undefined
  let previousPassword: string | undefined

  group.each.setup(() => {
    previousEmail = process.env.ADMIN_EMAIL
    previousPassword = process.env.ADMIN_PASSWORD
    // malo_seeder reads process.env at run time — never depend on the local .env
    process.env.ADMIN_EMAIL = ADMIN_EMAIL
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD

    return () => {
      if (previousEmail === undefined) delete process.env.ADMIN_EMAIL
      else process.env.ADMIN_EMAIL = previousEmail
      if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD
      else process.env.ADMIN_PASSWORD = previousPassword
    }
  })

  test('no seeder adds fabricated data to the admin account', async ({ assert }) => {
    await new MaloSeeder(client()).run()
    await new SandboxSeeder(client()).run()
    await new TestPlansSeeder(client()).run()
    await new BillingModuleStatesSeeder(client()).run()

    const { user, organization } = await adminOrganization()

    // The real account is on the pro plan — no seeder may bump it.
    assert.equal(organization.plan, 'pro')

    const boats = await Boat.query().where('organizationId', organization.id)
    assert.lengthOf(boats, 1)
    assert.equal(boats[0].name, '3D')

    const ports = await Port.query().where('organizationId', organization.id)
    assert.lengthOf(ports, 0)

    const notifications = await Notification.query().where('userId', user.id)
    assert.lengthOf(notifications, 0)
  }).timeout(120_000)

  test('malo_seeder is idempotent', async ({ assert }) => {
    await new MaloSeeder(client()).run()
    await new MaloSeeder(client()).run()

    const { organization } = await adminOrganization()

    const boats = await Boat.query().where('organizationId', organization.id)
    assert.lengthOf(boats, 1)

    const events = await BoatMaintenanceEvent.query().where('boatId', boats[0].id)
    const titles = events.map((e) => e.title)
    assert.lengthOf(titles, new Set(titles).size)
  }).timeout(60_000)
})
