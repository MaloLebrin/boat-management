import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import ContactMessage from '#models/contact_message'
import ContactMessageReceived from '#events/contact_message_received'
import SimulatorLeadCreated from '#events/simulator_lead_created'
import OnContactMessageReceived from '#listeners/on_contact_message_received'
import OnSimulatorLeadCreated from '#listeners/on_simulator_lead_created'
import EmailQueueService from '#services/email_queue_service'
import { SimulatorLeadFactory } from '#database/factories/simulator_lead_factory'
import SendSimulatorReportJob from '#jobs/send_simulator_report_job'
import SendSimulatorNurturingJob from '#jobs/send_simulator_nurturing_job'

/**
 * Listeners du formulaire de contact et du simulateur (#699).
 *
 * Ces deux-là ne produisent aucune ligne en base : leur effet est une **mise en
 * file**. C'est ce qui les rend faciles à casser sans bruit — rien ne se plaint,
 * l'e-mail ne part simplement pas. On observe donc les appels eux-mêmes.
 *
 * Le contact envoie **deux** e-mails : la notification à l'équipe et l'accusé de
 * réception au visiteur. Perdre le second laisse un visiteur sans confirmation,
 * ce qu'aucun test de route ne verrait.
 */

test.group('OnContactMessageReceived', (group) => {
  group.each.teardown(() => {
    app.container.restore(EmailQueueService)
  })

  test('queues both the team notification and the visitor acknowledgement', async ({ assert }) => {
    const sent: string[] = []
    app.container.swap(
      EmailQueueService,
      () =>
        ({
          async sendContactMessageNotification() {
            sent.push('notification')
          },
          async sendContactMessageAck() {
            sent.push('ack')
          },
        }) as unknown as EmailQueueService
    )

    const message = await ContactMessage.create({
      firstName: 'Camille',
      lastName: 'Roux',
      email: 'camille@example.com',
      organization: 'Marina Test',
      fleetSize: '1-5',
      subject: 'demo',
      message: 'Bonjour',
      locale: 'fr',
    })

    const listener = await app.container.make(OnContactMessageReceived)
    await listener.handle(new ContactMessageReceived(message))

    assert.deepEqual(sent, ['notification', 'ack'])
  })
})

test.group('OnSimulatorLeadCreated', (group) => {
  const reportDispatch = SendSimulatorReportJob.dispatch
  const nurturingDispatch = SendSimulatorNurturingJob.dispatch

  group.each.teardown(() => {
    SendSimulatorReportJob.dispatch = reportDispatch
    SendSimulatorNurturingJob.dispatch = nurturingDispatch
  })

  test('dispatches both the immediate report and the nurturing sequence', async ({ assert }) => {
    // Deux jobs distincts : le rapport part tout de suite, la séquence de
    // relance est programmée. Perdre le second, c'est perdre la relance J+3/J+7
    // sans que le rapport, lui, manque — donc sans symptôme visible.
    const dispatched: Array<{ job: string; leadId: string }> = []
    SendSimulatorReportJob.dispatch = (async (payload: { leadId: string }) => {
      dispatched.push({ job: 'report', leadId: payload.leadId })
    }) as never
    SendSimulatorNurturingJob.dispatch = (async (payload: { leadId: string }) => {
      dispatched.push({ job: 'nurturing', leadId: payload.leadId })
    }) as never

    const lead = await SimulatorLeadFactory.merge({ email: 'prospect@example.com' }).create()

    const listener = await app.container.make(OnSimulatorLeadCreated)
    await listener.handle(new SimulatorLeadCreated(lead))

    assert.deepEqual(dispatched, [
      { job: 'report', leadId: lead.id },
      { job: 'nurturing', leadId: lead.id },
    ])
  })
})
