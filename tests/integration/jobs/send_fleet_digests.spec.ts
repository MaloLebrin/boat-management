import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import SendMonthlyFleetReports from '#jobs/send_monthly_fleet_reports'
import SendWeeklyFleetDigests from '#jobs/send_weekly_fleet_digests'
import FleetDigestService from '#services/fleet_digest_service'

/**
 * Crons des rapports de flotte (#871) : chaque job délègue au service, dont
 * le contenu et les envois sont couverts par `fleet_digest_service.spec`.
 */
test.group('Fleet digest crons (#871)', (group) => {
  group.each.teardown(() => app.container.restore(FleetDigestService))

  test('the weekly and monthly jobs run their pass of the service', async ({ assert }) => {
    const calls: string[] = []
    const fake = {
      async sendWeekly() {
        calls.push('weekly')
        return 0
      },
      async sendMonthly() {
        calls.push('monthly')
        return 0
      },
    }
    app.container.swap(FleetDigestService, () => fake as unknown as FleetDigestService)

    const weeklyJob = await app.container.make(SendWeeklyFleetDigests)
    const monthlyJob = await app.container.make(SendMonthlyFleetReports)
    await weeklyJob.execute()
    await monthlyJob.execute()

    assert.deepEqual(calls, ['weekly', 'monthly'])
  })
})
