import ContactMessage from '#models/contact_message'
import { truncateDb } from '#tests/utils/db'
import mail from '@adonisjs/mail/services/main'
import { test } from '@japa/runner'

const validPayload = {
  subject: 'demo',
  firstName: 'Marc',
  lastName: 'Lefèvre',
  email: 'marc@marina-bleue.fr',
  organization: 'Marina Bleue',
  fleetSize: '5-20',
  message: "Bonjour, j'aimerais une démo sur ma flotte de 12 bateaux.",
  consent: true,
  locale: 'fr',
}

test.group('Contact form (functional)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.setup(() => {
    mail.fake()
  })
  group.each.teardown(() => mail.restore())

  test('GET /fr/contact renders the contact page', async ({ client }) => {
    const response = await client.get('/fr/contact')

    response.assertStatus(200)
  })

  test('POST /contact stores the message and redirects back', async ({ client, assert }) => {
    const response = await client.post('/contact').form(validPayload).redirects(0)

    response.assertStatus(302)

    const message = await ContactMessage.findBy('email', 'marc@marina-bleue.fr')
    assert.isNotNull(message)
    assert.equal(message!.subject, 'demo')
    assert.equal(message!.firstName, 'Marc')
    assert.equal(message!.organization, 'Marina Bleue')
    assert.equal(message!.fleetSize, '5-20')
    assert.equal(message!.locale, 'fr')
  })

  test('POST /contact notifies the team inbox and acknowledges the sender', async ({
    client,
    assert,
  }) => {
    // Callback-based `mail.send((message) => …)` is tracked in the `messages`
    // collection (the `mails` collection only captures class-based BaseMail).
    const { messages } = mail.fake()

    await client.post('/contact').form(validPayload).redirects(0)

    messages.assertSentCount(2)
    messages.assertSent((message) => message.hasTo('contact-test@fleetai.app'))
    messages.assertSent((message) => message.hasTo('marc@marina-bleue.fr'))

    const notification = messages
      .sent()
      .map((message) => message.toObject().message as { subject?: string; text?: string })
      .find((message) => message.subject?.startsWith('[Contact]'))
    assert.exists(notification)
    assert.include(notification!.text ?? '', 'marc@marina-bleue.fr')
  })

  test('POST /contact rejects an invalid email and stores nothing', async ({ client, assert }) => {
    const response = await client
      .post('/contact')
      .form({ ...validPayload, email: 'not-an-email' })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await ContactMessage.all(), 0)
  })

  test('POST /contact rejects a missing consent', async ({ client, assert }) => {
    const response = await client
      .post('/contact')
      .form({ ...validPayload, consent: false })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await ContactMessage.all(), 0)
  })

  test('POST /contact rejects an unknown subject', async ({ client, assert }) => {
    const response = await client
      .post('/contact')
      .form({ ...validPayload, subject: 'anything' })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await ContactMessage.all(), 0)
  })

  test('POST /contact rejects a message that is too short', async ({ client, assert }) => {
    const response = await client
      .post('/contact')
      .form({ ...validPayload, message: 'court' })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await ContactMessage.all(), 0)
  })

  test('POST /contact accepts a message without organization nor fleet size', async ({
    client,
    assert,
  }) => {
    await client
      .post('/contact')
      .form({
        subject: 'other',
        firstName: 'Ana',
        lastName: 'Ruiz',
        email: 'ana@example.com',
        message: 'Question sur la facturation annuelle, merci.',
        consent: true,
        locale: 'en',
      })
      .redirects(0)

    const message = await ContactMessage.findBy('email', 'ana@example.com')
    assert.isNotNull(message)
    assert.isNull(message!.organization)
    assert.isNull(message!.fleetSize)
    assert.equal(message!.locale, 'en')
  })
})
