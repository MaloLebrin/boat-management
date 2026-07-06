import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { createAdminUser } from '#tests/functional/helpers'
import RentalContract from '#models/rental_contract'
import QueueDedupService from '#services/queue_dedup_service'
import SendRentalContractEmail, {
  type SendRentalContractEmailPayload,
} from '#jobs/send_rental_contract_email'

test.group('SendRentalContractEmail job', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('generates the PDF and sends an email with a PDF attachment', async ({ assert }) => {
    // Callback-based `mail.send((message) => …)` is tracked in the `messages`
    // collection (the `mails` collection only captures class-based BaseMail).
    const { messages } = mail.fake()

    const user = await createAdminUser()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: orgId,
      clientEmail: 'alice@example.com',
    }).create()
    const contract = await RentalContract.create({
      organizationId: orgId,
      reservationId: reservation.id,
      clientId: null,
      status: 'draft',
    })

    const payload: SendRentalContractEmailPayload = {
      contractId: contract.id,
      organizationId: orgId,
      to: 'alice@example.com',
      locale: 'en',
      dedupKey: 'test-dedup-key',
    }

    // `payload` is a getter on the base Job; subclass to inject it. markRunning/
    // markCompleted are no-op UPDATEs when the dedup key row is absent.
    class TestSendRentalContractEmail extends SendRentalContractEmail {
      get payload(): SendRentalContractEmailPayload {
        return payload
      }
    }
    const dedup = await app.container.make(QueueDedupService)
    const job = new TestSendRentalContractEmail(dedup)

    await job.execute()

    messages.assertSentCount(1)
    messages.assertSent((message) => message.hasTo('alice@example.com'))

    // `attachData` attachments only live in the nodemailer message object, so
    // inspect it directly to confirm the generated PDF is attached.
    const [sent] = messages.sent()
    const node = sent.toObject().message as {
      attachments?: Array<{ contentType?: string; filename?: string }>
    }
    const pdf = node.attachments?.find((a) => a.contentType === 'application/pdf')
    assert.exists(pdf, 'expected a PDF attachment on the sent email')
    assert.match(pdf!.filename ?? '', /\.pdf$/)
  })
})
