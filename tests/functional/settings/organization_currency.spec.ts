import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import BoatPricing from '#models/boat_pricing'
import BoatReservation from '#models/boat_reservation'
import Invoice from '#models/invoice'
import Organization from '#models/organization'
import { createAdminUser, createEnterpriseAdminUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'

/**
 * Devise de travail de l'organisation (#627) : réglée dans `/settings/org`,
 * partagée au front (`organizationCurrency`) et proposée par défaut aux
 * nouveaux documents — une pièce ou un tarif existant garde la sienne.
 */
const invoiceForm = {
  'kind': 'quote',
  'issuedAt': '2026-07-05',
  'taxRate': 20,
  'lines[0][label]': 'Location semaine',
  'lines[0][quantity]': 1,
  'lines[0][unitPrice]': 100,
}

async function setCurrency(organizationId: number, currency: 'USD' | 'AUD' | 'GBP') {
  await Organization.query().where('id', organizationId).update({ currency })
}

test.group('Devise de travail de l’organisation (#627)', (group) => {
  group.each.setup(() => truncateDb())

  test('une organisation existante travaille en euros', async ({ assert }) => {
    const admin = await createAdminUser()
    const org = await Organization.findOrFail(admin.organizationId!)
    assert.equal(org.currency, 'EUR')
  })

  test('PUT /settings/org enregistre la devise', async ({ client, assert }) => {
    const admin = await createAdminUser()

    const response = await client
      .put('/settings/org')
      .loginAs(admin)
      .form({ name: 'Charters du Pacifique', currency: 'AUD' })
      .redirects(0)

    response.assertStatus(302)
    const org = await Organization.findOrFail(admin.organizationId!)
    assert.equal(org.currency, 'AUD')
    assert.equal(org.name, 'Charters du Pacifique')
  })

  test('PUT /settings/org sans devise conserve la devise en place', async ({ client, assert }) => {
    const admin = await createAdminUser()
    await setCurrency(admin.organizationId!, 'USD')

    await client.put('/settings/org').loginAs(admin).form({ name: 'Renommée' }).redirects(0)

    const org = await Organization.findOrFail(admin.organizationId!)
    assert.equal(org.currency, 'USD')
  })

  test('PUT /settings/org refuse une devise hors liste', async ({ client, assert }) => {
    const admin = await createAdminUser()

    const response = await client
      .put('/settings/org')
      .loginAs(admin)
      .form({ name: 'Renommée', currency: 'usd' })
      .redirects(0)

    response.assertStatus(302)
    const org = await Organization.findOrFail(admin.organizationId!)
    assert.equal(org.currency, 'EUR')
    assert.notEqual(org.name, 'Renommée')
  })

  test('la page /settings/org et les props partagées exposent la devise', async ({ client }) => {
    const admin = await createAdminUser()
    await setCurrency(admin.organizationId!, 'GBP')

    const response = await client.get('/settings/org').loginAs(admin).withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      organizationCurrency: 'GBP',
      organization: { currency: 'GBP' },
    })
  })

  test('une nouvelle facture sans devise prend celle de l’organisation', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    await setCurrency(user.organizationId!, 'USD')

    await client.post('/invoices').loginAs(user).form(invoiceForm).redirects(0)

    const invoice = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()
    assert.equal(invoice.currency, 'USD')
  })

  test('une devise explicite sur la facture l’emporte', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    await setCurrency(user.organizationId!, 'USD')

    await client
      .post('/invoices')
      .loginAs(user)
      .form({ ...invoiceForm, currency: 'JPY' })
      .redirects(0)

    const invoice = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()
    assert.equal(invoice.currency, 'JPY')
  })

  test('une facture refuse une devise hors liste', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client
      .post('/invoices')
      .loginAs(user)
      .form({ ...invoiceForm, currency: 'BTC' })
      .redirects(0)

    const created = await Invoice.query().where('organizationId', user.organizationId!).first()
    assert.isNull(created)
  })

  test('un nouveau tarif sans devise prend celle de l’organisation', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    await setCurrency(user.organizationId!, 'AUD')
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.put(`/boats/${boat.id}/pricing`).loginAs(user).form({ baseDailyPrice: 300 })

    const pricing = await BoatPricing.query().where('boatId', boat.id).firstOrFail()
    assert.equal(pricing.currency, 'AUD')
  })

  test('changer la devise de l’organisation ne touche pas aux factures existantes', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    await client.post('/invoices').loginAs(user).form(invoiceForm).redirects(0)

    await client
      .put('/settings/org')
      .loginAs(user)
      .form({ name: 'Renommée', currency: 'USD' })
      .redirects(0)

    const invoice = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()
    assert.equal(invoice.currency, 'EUR')
  })

  test('un devis né d’une réservation reprend la devise du tarif du bateau', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    await setCurrency(user.organizationId!, 'USD')
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatPricing.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      baseDailyPrice: '200',
      currency: 'GBP',
    })
    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: user.organizationId!,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2026-07-01T10:00'),
      endsAt: DateTime.fromISO('2026-07-04T10:00'),
      clientName: 'Alice',
      totalPrice: '600',
    })

    await client.post(`/invoices/from-reservation/${reservation.id}`).loginAs(user).redirects(0)

    const invoice = await Invoice.query().where('reservationId', reservation.id).firstOrFail()
    assert.equal(invoice.currency, 'GBP')
  })

  test('sans tarif, le devis d’une réservation prend la devise de l’organisation', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    await setCurrency(user.organizationId!, 'USD')
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: user.organizationId!,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2026-07-01T10:00'),
      endsAt: DateTime.fromISO('2026-07-04T10:00'),
      clientName: 'Alice',
      totalPrice: '600',
    })

    await client.post(`/invoices/from-reservation/${reservation.id}`).loginAs(user).redirects(0)

    const invoice = await Invoice.query().where('reservationId', reservation.id).firstOrFail()
    assert.equal(invoice.currency, 'USD')
  })
})
