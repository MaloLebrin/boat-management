import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import MarinaStay from '#models/marina_stay'
import Spot from '#models/spot'
import { BoatFactory } from '#database/factories/boat_factory'
import { ClientFactory } from '#database/factories/client_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { PortFactory } from '#database/factories/port_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createEnterpriseAdminUser, createMemberUser } from '#tests/functional/helpers'
import type User from '#models/user'

/**
 * Escales de la capitainerie (#891) : un visiteur ou un bateau de la flotte
 * sur une place, de son arrivée à sa facture. Chaque refus a son témoin en
 * base — une redirection seule ne prouve pas que rien n'a été écrit.
 */

async function marina(user: User, spotAttrs: Partial<Spot> = {}) {
  const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
  const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
  const spot = await SpotFactory.merge({
    organizationId: user.organizationId!,
    pontoonId: pontoon.id,
    name: 'A1',
    lengthM: 12,
    dailyRate: 30,
    ...spotAttrs,
  }).create()
  return { port, pontoon, spot }
}

function visitor(spotId: number, overrides: Record<string, unknown> = {}) {
  return {
    spotId,
    visitorName: 'Belle Île',
    visitorLengthM: 10,
    visitorContact: '06 00 00 00 00',
    arrivalOn: '2026-07-01',
    departureOn: '2026-07-04',
    ...overrides,
  }
}

test.group('Escales — création', (group) => {
  group.each.setup(() => truncateDb())

  test('un visiteur s’enregistre sur une place, au tarif de la place', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot } = await marina(user)

    const response = await client
      .post(`/ports/${port.id}/marina-stays`)
      .loginAs(user)
      .json(
        visitor(spot.id, {
          services: [{ label: 'Électricité', quantity: 3, unitPrice: 4 }],
        })
      )
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Stay recorded.')
    const stay = await MarinaStay.query().firstOrFail()
    assert.equal(stay.portId, port.id)
    assert.equal(stay.organizationId, user.organizationId)
    assert.equal(stay.status, 'expected')
    assert.equal(stay.visitorName, 'Belle Île')
    assert.isNull(stay.boatId)
    assert.equal(stay.nightlyRate, 30)
    assert.equal(stay.arrivalOn.toISODate(), '2026-07-01')
    assert.deepEqual(stay.services, [{ label: 'Électricité', quantity: 3, unitPrice: 4 }])
  })

  test('un bateau de la flotte remplace les champs visiteur', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot } = await marina(user)
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      lengthM: 9,
    }).create()

    await client
      .post(`/ports/${port.id}/marina-stays`)
      .loginAs(user)
      .json({ ...visitor(spot.id), boatId: boat.id })
      .redirects(0)

    const stay = await MarinaStay.query().firstOrFail()
    assert.equal(stay.boatId, boat.id)
    assert.isNull(stay.visitorName)
    assert.isNull(stay.visitorContact)
  })

  test('un bateau plus long que la place passe, avec un avertissement', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot } = await marina(user, { lengthM: 8 })

    const response = await client
      .post(`/ports/${port.id}/marina-stays`)
      .loginAs(user)
      .json(visitor(spot.id, { visitorLengthM: 11 }))
      .redirects(0)

    response.assertFlashMessage(
      'success',
      'Stay recorded. Warning: the boat is longer than the berth.'
    )
    assert.lengthOf(await MarinaStay.all(), 1)
  })

  test('deux escales actives ne se chevauchent pas sur une place', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot } = await marina(user)
    await client.post(`/ports/${port.id}/marina-stays`).loginAs(user).json(visitor(spot.id))

    const clash = await client
      .post(`/ports/${port.id}/marina-stays`)
      .loginAs(user)
      .json(
        visitor(spot.id, {
          visitorName: 'Autre',
          arrivalOn: '2026-07-03',
          departureOn: '2026-07-06',
        })
      )
      .redirects(0)

    clash.assertFlashMessage('error', 'This berth is already taken on these dates by Belle Île.')
    assert.lengthOf(await MarinaStay.all(), 1)

    // Le jour du départ de l'un est libre pour l'arrivée de l'autre.
    await client
      .post(`/ports/${port.id}/marina-stays`)
      .loginAs(user)
      .json(
        visitor(spot.id, {
          visitorName: 'Suivant',
          arrivalOn: '2026-07-04',
          departureOn: '2026-07-05',
        })
      )
    assert.lengthOf(await MarinaStay.all(), 2)
  })

  test('une place hors service refuse toute escale', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot } = await marina(user, { status: 'out_of_service' })

    const response = await client
      .post(`/ports/${port.id}/marina-stays`)
      .loginAs(user)
      .json(visitor(spot.id))
      .redirects(0)

    response.assertFlashMessage('error', 'This berth is out of service.')
    assert.lengthOf(await MarinaStay.all(), 0)
  })

  test('ni bateau ni visiteur : refusé', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot } = await marina(user)

    const response = await client
      .post(`/ports/${port.id}/marina-stays`)
      .loginAs(user)
      .json(visitor(spot.id, { visitorName: null }))
      .redirects(0)

    response.assertFlashMessage('error', 'Pick a fleet boat or name the visitor.')
    assert.lengthOf(await MarinaStay.all(), 0)
  })

  test('un départ avant l’arrivée est refusé par la validation', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot } = await marina(user)

    await client
      .post(`/ports/${port.id}/marina-stays`)
      .loginAs(user)
      .json(visitor(spot.id, { departureOn: '2026-07-01' }))
      .redirects(0)

    assert.lengthOf(await MarinaStay.all(), 0)
  })

  test("une place d'un autre port de l'organisation est refusée", async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port } = await marina(user)
    const { spot: elsewhere } = await marina(user)

    const response = await client
      .post(`/ports/${port.id}/marina-stays`)
      .loginAs(user)
      .json(visitor(elsewhere.id))
      .redirects(0)

    response.assertFlashMessage('error', 'This berth does not belong to this port.')
    assert.lengthOf(await MarinaStay.all(), 0)
  })
})

test.group('Escales — cycle de vie et facture', (group) => {
  group.each.setup(() => truncateDb())

  async function stayFor(user: User, attrs: Partial<MarinaStay> = {}) {
    const { port, spot } = await marina(user)
    const stay = await MarinaStay.create({
      organizationId: user.organizationId!,
      portId: port.id,
      spotId: spot.id,
      visitorName: 'Belle Île',
      arrivalOn: DateTime.fromISO('2026-07-01'),
      departureOn: DateTime.fromISO('2026-07-04'),
      status: 'expected',
      nightlyRate: 30,
      services: [{ label: 'Électricité', quantity: 3, unitPrice: 4 }],
      ...attrs,
    })
    return { port, spot, stay }
  }

  test('attendue → arrivée → partie ; un retour en arrière est refusé', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const { port, stay } = await stayFor(user)
    const url = `/ports/${port.id}/marina-stays/${stay.id}/status`

    await client.patch(url).loginAs(user).json({ status: 'arrived' })
    await stay.refresh()
    assert.equal(stay.status, 'arrived')

    await client.patch(url).loginAs(user).json({ status: 'departed' })
    await stay.refresh()
    assert.equal(stay.status, 'departed')

    const back = await client.patch(url).loginAs(user).json({ status: 'cancelled' }).redirects(0)
    back.assertFlashMessage('error', 'This status change is not possible for this stay.')
    await stay.refresh()
    assert.equal(stay.status, 'departed')
  })

  test('la facture reprend nuitées × tarif et services, une seule fois', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const customer = await ClientFactory.merge({ organizationId: user.organizationId! }).create()
    const { port, stay } = await stayFor(user, { status: 'arrived', clientId: customer.id })

    const response = await client
      .post(`/ports/${port.id}/marina-stays/${stay.id}/invoice`)
      .loginAs(user)
      .redirects(0)

    const invoice = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()
    response.assertHeader('location', `/invoices/${invoice.id}`)
    assert.equal(invoice.status, 'draft')
    assert.equal(invoice.clientId, customer.id)
    assert.equal(Number(invoice.subtotal), 3 * 30 + 3 * 4)

    const lines = await InvoiceLine.query().where('invoiceId', invoice.id).orderBy('position')
    assert.lengthOf(lines, 2)
    assert.equal(lines[0].label, 'Berth A1 — 3 nights')
    assert.equal(Number(lines[0].quantity), 3)
    assert.equal(lines[1].label, 'Électricité')

    await stay.refresh()
    assert.equal(stay.status, 'invoiced')
    assert.equal(stay.invoiceId, invoice.id)

    // Une seconde soumission ne crée pas une seconde facture.
    const again = await client
      .post(`/ports/${port.id}/marina-stays/${stay.id}/invoice`)
      .loginAs(user)
      .redirects(0)
    again.assertFlashMessage(
      'error',
      'This stay cannot be invoiced (not arrived yet, or already invoiced).'
    )
    assert.lengthOf(await Invoice.query().where('organizationId', user.organizationId!), 1)
  })

  test('une escale attendue ne se facture pas encore', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, stay } = await stayFor(user)

    await client.post(`/ports/${port.id}/marina-stays/${stay.id}/invoice`).loginAs(user)

    assert.lengthOf(await Invoice.query().where('organizationId', user.organizationId!), 0)
  })

  test('une escale facturée ne se supprime plus', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, stay } = await stayFor(user, { status: 'invoiced' })

    const response = await client
      .delete(`/ports/${port.id}/marina-stays/${stay.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertFlashMessage('error', 'An invoiced stay can no longer be deleted.')
    assert.isNotNull(await MarinaStay.find(stay.id))
  })

  test('un member pose et fait avancer une escale, mais ne la supprime pas', async ({
    client,
    assert,
  }) => {
    const admin = await createEnterpriseAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const { port, stay } = await stayFor(admin)

    await client
      .patch(`/ports/${port.id}/marina-stays/${stay.id}/status`)
      .loginAs(member)
      .json({ status: 'arrived' })
    await stay.refresh()
    assert.equal(stay.status, 'arrived')

    await client.delete(`/ports/${port.id}/marina-stays/${stay.id}`).loginAs(member)
    assert.isNotNull(await MarinaStay.find(stay.id))
  })

  test('une escale d’un autre port est introuvable par cette URL', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { stay } = await stayFor(user)
    const { port: other } = await marina(user)

    const response = await client
      .patch(`/ports/${other.id}/marina-stays/${stay.id}/status`)
      .loginAs(user)
      .json({ status: 'arrived' })
      .redirects(0)

    response.assertFlashMessage('error', 'Stay not found.')
    await stay.refresh()
    assert.equal(stay.status, 'expected')
  })
})

test.group('Places — champs d’exploitation et garde de suppression', (group) => {
  group.each.setup(() => truncateDb())

  test('une place porte ses dimensions, son type, son statut et ses tarifs', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const { spot } = await marina(user)

    await client.put(`/spots/${spot.id}`).loginAs(user).json({
      name: 'A1',
      lengthM: 14.5,
      beamM: 4.6,
      draftM: 2.2,
      kind: 'visitor',
      status: 'reserved',
      dailyRate: 42,
      monthlyRate: 600,
      annualRate: null,
      notes: 'Borne 16 A',
    })

    await spot.refresh()
    assert.equal(spot.lengthM, 14.5)
    assert.equal(spot.beamM, 4.6)
    assert.equal(spot.draftM, 2.2)
    assert.equal(spot.kind, 'visitor')
    assert.equal(spot.status, 'reserved')
    assert.equal(spot.dailyRate, 42)
    assert.isNull(spot.annualRate)
    assert.equal(spot.notes, 'Borne 16 A')
  })

  test('un ancien formulaire (nom seul) ne vide pas les champs d’exploitation', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const { spot } = await marina(user)

    await client.put(`/spots/${spot.id}`).loginAs(user).json({ name: 'A1 bis' })

    await spot.refresh()
    assert.equal(spot.name, 'A1 bis')
    assert.equal(spot.lengthM, 12)
    assert.equal(spot.dailyRate, 30)
  })

  test('une place tenue par une escale active ne se supprime pas', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot } = await marina(user)
    await MarinaStay.create({
      organizationId: user.organizationId!,
      portId: port.id,
      spotId: spot.id,
      visitorName: 'Belle Île',
      arrivalOn: DateTime.fromISO('2026-07-01'),
      departureOn: DateTime.fromISO('2026-07-04'),
      status: 'arrived',
      nightlyRate: 30,
      services: [],
    })

    const response = await client.delete(`/spots/${spot.id}`).loginAs(user).redirects(0)

    response.assertFlashMessage(
      'error',
      'Cannot delete this berth: an active stay or contract holds it.'
    )
    assert.isNotNull(await Spot.find(spot.id))
  })
})
