import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import BoatInspection from '#models/boat_inspection'
import QueueDedupService from '#services/queue_dedup_service'
import SendInspectionEmail, { type SendInspectionEmailPayload } from '#jobs/send_inspection_email'

test.group('SendInspectionEmail job (#889)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => restoreCloudinary())

  async function run(locale: string, orgOverride?: number) {
    const user = await createAdminUser()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId, name: 'Albatros' }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: orgId,
    }).create()
    const inspection = await BoatInspection.create({
      reservationId: reservation.id,
      organizationId: orgId,
      kind: 'checkin',
      performedAt: DateTime.utc(),
      lockedAt: DateTime.utc(),
    })

    const payload: SendInspectionEmailPayload = {
      inspectionId: inspection.id,
      organizationId: orgOverride ?? orgId,
      to: 'alice@example.com',
      locale,
      dedupKey: 'test-dedup-key',
    }
    // `payload` est un getter du Job de base : on le fournit par sous-classe.
    class TestSendInspectionEmail extends SendInspectionEmail {
      get payload(): SendInspectionEmailPayload {
        return payload
      }
    }
    const job = new TestSendInspectionEmail(await app.container.make(QueueDedupService))
    await job.execute()
    return { reservation }
  }

  test('sends the inspection PDF as an attachment, in the requested locale', async ({ assert }) => {
    const { messages } = mail.fake()
    swapFakeCloudinary()

    const { reservation } = await run('fr')

    messages.assertSentCount(1)
    messages.assertSent((message) => message.hasTo('alice@example.com'))
    const node = messages.sent()[0].toObject().message as {
      subject: string
      html: string
      attachments?: Array<{ contentType?: string; filename?: string }>
    }
    const pdf = node.attachments?.find((attachment) => attachment.contentType === 'application/pdf')
    assert.equal(pdf?.filename, `etat-des-lieux-${reservation.id}-checkin.pdf`)
    assert.include(node.subject, 'État des lieux (Retour) — Albatros')
    assert.include(node.html, 'signé par les deux parties')
    mail.restore()
  })

  test('refuses an inspection of another organization', async ({ assert }) => {
    mail.fake()
    swapFakeCloudinary()
    const other = await createAdminUser()

    await assert.rejects(() => run('en', other.organizationId!))
    mail.restore()
  })
})
