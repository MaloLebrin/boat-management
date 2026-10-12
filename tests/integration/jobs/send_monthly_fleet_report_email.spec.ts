import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import { OrganizationFactory } from '#database/factories/organization_factory'
import SendMonthlyFleetReportEmail from '#jobs/send_monthly_fleet_report_email'
import QueueDedupKey, { QUEUE_DEDUP_KEY_STATUSES } from '#models/queue_dedup_key'
import { emptyCostBreakdown } from '#shared/helpers/reporting'
import type { SendMonthlyFleetReportPayload } from '#shared/types/fleet_digest'

/**
 * Envoi d'un rapport mensuel de flotte (#871) : e-mail dans la langue du
 * destinataire, PDF joint, clé de déduplication passée à `completed`.
 */
test.group('SendMonthlyFleetReportEmail (#871)', (group) => {
  group.each.setup(() => {
    mail.fake()
    return () => mail.restore()
  })

  test('sends the email with the PDF attached and completes its key', async ({ assert }) => {
    const { messages } = mail.fake()
    const org = await OrganizationFactory.merge({ plan: 'pro', name: 'Yacht Club' }).create()
    const dedupKey = `fleet-report:monthly:${org.id}:2026-09:1`
    await QueueDedupKey.create({
      key: dedupKey,
      jobName: SendMonthlyFleetReportEmail.name,
      queue: 'emails',
      status: QUEUE_DEDUP_KEY_STATUSES.PENDING,
      queueJobId: null,
      payloadHash: 'test',
      completedAt: null,
      lastError: null,
    })
    const payload: SendMonthlyFleetReportPayload = {
      report: {
        organization: { id: org.id, name: org.name, currency: 'EUR' },
        month: '2026-09',
        period: { preset: 'month', from: '2026-09-01', to: '2026-09-30', days: 30 },
        costs: { ...emptyCostBreakdown(), fuel: 300, total: 300 },
        previousCosts: 0,
        topCategories: [{ category: 'fuel', amount: 300 }],
        engineHours: 4,
        distanceNm: 20,
        maintenance: { planned: 1, completed: 1, performed: 1 },
        rental: null,
        boats: [],
      },
      userId: 1,
      to: 'admin@example.com',
      name: 'Admin',
      locale: 'en',
      dedupKey,
    }

    // File synchrone en test : le job s'exécute dans le `dispatch`.
    await SendMonthlyFleetReportEmail.dispatch(payload)

    messages.assertSentCount(1)
    const [sent] = messages.sent()
    assert.isTrue(sent.hasTo('admin@example.com'))
    const message = sent.toObject().message
    assert.include(message.subject as string, 'fleet report for September 2026')
    const attachments = message.attachments as { filename?: string }[]
    assert.equal(attachments[0].filename, 'fleet-report-2026-09.pdf')
    const key = await QueueDedupKey.findByOrFail('key', dedupKey)
    assert.equal(key.status, QUEUE_DEDUP_KEY_STATUSES.COMPLETED)
  })
})
