import { test } from '@japa/runner'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEquipmentActionFactory } from '#database/factories/boat_equipment_action_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatInspectionFactory } from '#database/factories/boat_inspection_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { ClientFactory } from '#database/factories/client_factory'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { InvoiceLineFactory } from '#database/factories/invoice_line_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { PricingSeasonFactory } from '#database/factories/pricing_season_factory'
import { RentalContractFactory } from '#database/factories/rental_contract_factory'
import { UserFactory } from '#database/factories/user_factory'
import Invoice from '#models/invoice'

/**
 * Chaque factory ajoutée par la vague 0.1 du plan de refactorisation doit
 * produire une ligne persistée valide, avec ses relations et ses états.
 */
async function boatWithOrganization() {
  const boat = await BoatFactory.with('organization').create()
  return { boat, organizationId: boat.organizationId }
}

test.group('Factories (vague 0.1)', () => {
  test('InvoiceFactory: quote by default, states invoice/sent/paid/overdue', async ({ assert }) => {
    const quote = await InvoiceFactory.with('organization').create()
    assert.equal(quote.kind, 'quote')
    assert.equal(quote.status, 'draft')
    assert.match(quote.number, /^DEV-\d{6}$/)
    assert.equal(quote.total, '120.00')

    const paid = await InvoiceFactory.with('organization').apply('invoice').apply('paid').create()
    assert.equal(paid.kind, 'invoice')
    assert.match(paid.number, /^FAC-\d{6}$/)
    assert.equal(paid.status, 'paid')
    assert.isNotNull(paid.paidAt)

    const overdue = await InvoiceFactory.with('organization').apply('overdue').create()
    assert.equal(overdue.status, 'sent')
    assert.isTrue(overdue.dueAt!.toMillis() < Date.now())

    const organization = await OrganizationFactory.create()
    const client = await ClientFactory.merge({ organizationId: organization.id }).create()
    const withClient = await InvoiceFactory.merge({
      organizationId: organization.id,
      clientId: client.id,
    }).create()
    assert.equal(withClient.clientId, client.id)
    assert.isNotNull(await Invoice.find(withClient.id))
  })

  test('InvoiceLineFactory attaches to an invoice', async ({ assert }) => {
    const invoice = await InvoiceFactory.with('organization').create()
    const line = await InvoiceLineFactory.merge({ invoiceId: invoice.id }).create()

    assert.equal(line.invoiceId, invoice.id)
    assert.equal(line.amount, '100.00')
    assert.equal(line.position, 0)
  })

  test('BoatInspectionFactory: checkout by default, checkin state', async ({ assert }) => {
    const { boat, organizationId } = await boatWithOrganization()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId,
    }).create()

    const checkout = await BoatInspectionFactory.merge({
      reservationId: reservation.id,
      organizationId,
    }).create()
    const checkin = await BoatInspectionFactory.merge({
      reservationId: reservation.id,
      organizationId,
    })
      .apply('checkin')
      .create()

    assert.equal(checkout.kind, 'checkout')
    assert.equal(checkin.kind, 'checkin')
    assert.isAtLeast(checkout.fuelLevel!, 0)
    assert.isAtMost(checkout.fuelLevel!, 100)
  })

  test('BoatIncidentFactory: open by default, closed state', async ({ assert }) => {
    const { boat, organizationId } = await boatWithOrganization()

    const open = await BoatIncidentFactory.merge({ boatId: boat.id, organizationId }).create()
    const closed = await BoatIncidentFactory.merge({ boatId: boat.id, organizationId })
      .apply('closed')
      .create()

    assert.equal(open.status, 'open')
    assert.isNull(open.closedAt)
    assert.equal(closed.status, 'closed')
    assert.isNotNull(closed.closedAt)
  })

  test('BoatMaintenanceTaskFactory: open in 30 days, states overdue/done/noDueDate', async ({
    assert,
  }) => {
    const task = await BoatMaintenanceTaskFactory.with('boat', 1, (boat) =>
      boat.with('organization')
    ).create()
    assert.equal(task.status, 'open')
    assert.equal(task.subject, 'boat')
    assert.isTrue(task.dueAt!.toMillis() > Date.now())

    const overdue = await BoatMaintenanceTaskFactory.merge({ boatId: task.boatId })
      .apply('overdue')
      .create()
    assert.isTrue(overdue.dueAt!.toMillis() < Date.now())

    const done = await BoatMaintenanceTaskFactory.merge({ boatId: task.boatId })
      .apply('done')
      .create()
    assert.equal(done.status, 'done')
    assert.isNotNull(done.doneAt)

    const undated = await BoatMaintenanceTaskFactory.merge({ boatId: task.boatId })
      .apply('noDueDate')
      .create()
    assert.isNull(undated.dueAt)
  })

  test('RentalContractFactory: draft by default, signed state', async ({ assert }) => {
    const { boat, organizationId } = await boatWithOrganization()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId,
    }).create()

    const draft = await RentalContractFactory.merge({
      reservationId: reservation.id,
      organizationId,
    }).create()
    // Un seul contrat par réservation (contrainte unique) : seconde réservation.
    const otherReservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId,
    }).create()
    const signed = await RentalContractFactory.merge({
      reservationId: otherReservation.id,
      organizationId,
    })
      .apply('signed')
      .create()

    assert.equal(draft.status, 'draft')
    assert.isNull(draft.signedAt)
    assert.equal(signed.status, 'signed')
    assert.isNotNull(signed.signedAt)
  })

  test('CrewMemberFactory attaches to an organization', async ({ assert }) => {
    const organization = await OrganizationFactory.create()
    const member = await CrewMemberFactory.merge({ organizationId: organization.id }).create()

    assert.equal(member.organizationId, organization.id)
    assert.isNotEmpty(member.firstName)
    assert.isNotEmpty(member.lastName)
  })

  test('PricingSeasonFactory: daily price by default, multiplier state', async ({ assert }) => {
    const fixed = await PricingSeasonFactory.with('organization').create()
    const ratio = await PricingSeasonFactory.with('organization').apply('multiplier').create()

    assert.equal(fixed.dailyPrice, '200.00')
    assert.isNull(fixed.multiplier)
    assert.isNull(fixed.boatId)
    assert.isTrue(fixed.startsOn.toMillis() <= fixed.endsOn.toMillis())
    assert.isNull(ratio.dailyPrice)
    assert.equal(ratio.multiplier, '1.500')
  })

  test('BoatEquipmentActionFactory: pending to_buy by default, done state', async ({ assert }) => {
    const { boat, organizationId } = await boatWithOrganization()
    const user = await UserFactory.merge({ organizationId }).create()

    const pending = await BoatEquipmentActionFactory.merge({
      boatId: boat.id,
      organizationId,
      createdBy: user.id,
    }).create()
    const done = await BoatEquipmentActionFactory.merge({
      boatId: boat.id,
      organizationId,
      createdBy: user.id,
    })
      .apply('done')
      .create()

    assert.equal(pending.actionType, 'to_buy')
    assert.equal(pending.status, 'pending')
    assert.isNull(pending.resolvedAt)
    assert.equal(done.status, 'done')
    assert.isNotNull(done.resolvedAt)
  })
})
