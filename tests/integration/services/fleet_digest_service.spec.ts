import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import { BoatDocumentFactory } from '#database/factories/boat_document_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatFuelLogFactory } from '#database/factories/boat_fuel_log_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import type Boat from '#models/boat'
import type Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import QueueDedupKey from '#models/queue_dedup_key'
import type User from '#models/user'
import FleetDigestService from '#services/fleet_digest_service'
import OrganizationModuleService from '#services/organization_module_service'
import { weeklyDigestWindow } from '#shared/helpers/fleet_digest'
import type { OrgRole } from '#shared/types/organization'
import type { PlanTier } from '#shared/types/plan'

/**
 * Rapports de flotte par e-mail (#871) : ce que la synthèse hebdomadaire et
 * le rapport mensuel contiennent, qui les reçoit, et qu'ils ne partent ni
 * vides ni deux fois. La file est synchrone en test et le mailer simulé :
 * chaque envoi traverse le vrai rendu (gabarit Edge, PDF).
 */

const NOW = DateTime.now()
const TODAY = NOW.setZone('Europe/Paris').startOf('day')

async function service() {
  return app.container.make(FleetDigestService)
}

async function fleetOrg(plan: PlanTier = 'pro', overrides: Partial<Organization> = {}) {
  const org = await OrganizationFactory.merge({ plan, ...overrides }).create()
  const boat = await BoatFactory.merge({ organizationId: org.id, name: 'Ondine' }).create()
  return { org, boat }
}

async function member(
  org: Organization,
  role: OrgRole,
  overrides: Partial<User> = {}
): Promise<User> {
  const user = await UserFactory.merge({
    organizationId: org.id,
    locale: 'fr',
    ...overrides,
  }).create()
  await OrganizationMembership.create({ userId: user.id, organizationId: org.id, role })
  return user
}

async function grant(org: Organization, ...modules: ('charter' | 'crm_invoicing')[]) {
  const modulesService = await app.container.make(OrganizationModuleService)
  for (const module of modules) await modulesService.grantModule(org.id, module)
}

function overdueTask(boat: Boat, title = 'Vidange moteur') {
  return BoatMaintenanceTaskFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
    title,
    dueAt: TODAY.minus({ days: 3 }),
  }).create()
}

test.group('FleetDigestService.buildWeekly (#871)', () => {
  test('collects every section of the week, bounded to its horizon', async ({ assert }) => {
    const { org, boat } = await fleetOrg()
    await overdueTask(boat)
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      title: 'Anodes',
      dueAt: TODAY.plus({ days: 4 }),
    }).create()
    // Hors horizon, ou déjà faite : rien.
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      dueAt: TODAY.plus({ days: 40 }),
    }).create()
    await BoatMaintenanceTaskFactory.apply('done')
      .merge({ boatId: boat.id, dueAt: TODAY.minus({ days: 2 }) })
      .create()
    await BoatIncidentFactory.merge({ boatId: boat.id, organizationId: org.id }).create()
    await BoatIncidentFactory.apply('closed')
      .merge({ boatId: boat.id, organizationId: org.id })
      .create()
    await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: org.id,
      type: 'insurance',
      expiresAt: TODAY.plus({ days: 10 }),
    }).create()
    await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: org.id,
      expiresAt: TODAY.plus({ days: 90 }),
    }).create()
    await BoatSafetyEquipmentFactory.merge({
      boatId: boat.id,
      equipmentType: 'flare',
      expiryDate: TODAY.minus({ days: 5 }),
    }).create()
    const window = weeklyDigestWindow(TODAY.toISODate()!)
    await BoatFuelLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      fueledAt: DateTime.fromISO(window.past.from).plus({ days: 2 }),
      totalCost: '150.00',
    }).create()

    const digestService = await service()
    const digest = await digestService.buildWeekly(org, NOW)

    assert.equal(digest.organization.name, org.name)
    assert.equal(digest.week, window.week)
    assert.equal(digest.overdueTasks.total, 1)
    assert.equal(digest.overdueTasks.items[0].title, 'Vidange moteur')
    assert.equal(digest.overdueTasks.items[0].boatName, 'Ondine')
    assert.equal(digest.upcomingTasks.total, 1)
    assert.equal(digest.upcomingTasks.items[0].title, 'Anodes')
    assert.equal(digest.openIncidents.total, 1)
    assert.equal(digest.expiring.total, 2)
    assert.deepEqual(
      digest.expiring.items.map((item) => [item.kind, item.expired]),
      [
        ['safety_equipment', true],
        ['document', false],
      ]
    )
    assert.equal(digest.expenses.fuel, 150)
    assert.equal(digest.expenses.total, 150)
    // Sans les modules, les sections Location et Facturation n'existent pas.
    assert.isNull(digest.reservations)
    assert.isNull(digest.overdueInvoices)
  })

  test('bookings and overdue invoices come with their modules', async ({ assert }) => {
    const { org, boat } = await fleetOrg()
    await grant(org, 'charter', 'crm_invoicing')
    const window = weeklyDigestWindow(TODAY.toISODate()!)
    const monday = DateTime.fromISO(window.upcoming.from, { zone: 'Europe/Paris' })
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: org.id,
      clientName: 'Camille Martin',
      status: 'confirmed',
      startsAt: monday.plus({ days: 4, hours: 9 }),
      endsAt: monday.plus({ days: 6, hours: 18 }),
    }).create()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: org.id,
      status: 'confirmed',
      startsAt: monday.plus({ days: 20 }),
      endsAt: monday.plus({ days: 22 }),
    }).create()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: org.id,
      status: 'cancelled',
      startsAt: monday.plus({ days: 1 }),
      endsAt: monday.plus({ days: 2 }),
    }).create()
    // Les états s'appliquent après `merge` : l'échéance vient d'eux (J-10, J+30).
    await InvoiceFactory.apply('invoice')
      .apply('overdue')
      .merge({ organizationId: org.id })
      .create()
    await InvoiceFactory.apply('invoice').apply('sent').merge({ organizationId: org.id }).create()

    const digestService = await service()
    const digest = await digestService.buildWeekly(org, NOW)

    assert.equal(digest.reservations?.total, 1)
    assert.equal(digest.reservations?.items[0].clientName, 'Camille Martin')
    assert.equal(digest.overdueInvoices?.total, 1)
  })

  test('a trashed boat and another organization never show up', async ({ assert }) => {
    const { org, boat } = await fleetOrg()
    const trashed = await BoatFactory.merge({
      organizationId: org.id,
      deletedAt: DateTime.now(),
    }).create()
    await overdueTask(trashed, 'Dans la corbeille')
    const other = await fleetOrg()
    await overdueTask(other.boat, 'Ailleurs')
    await overdueTask(boat)

    const digestService = await service()
    const digest = await digestService.buildWeekly(org, NOW)

    assert.deepEqual(
      digest.overdueTasks.items.map((task) => task.title),
      ['Vidange moteur']
    )
  })

  test('lists are capped, totals stay exact', async ({ assert }) => {
    const { org, boat } = await fleetOrg()
    for (let i = 0; i < 7; i++) await overdueTask(boat, `Tâche ${i}`)

    const digestService = await service()
    const digest = await digestService.buildWeekly(org, NOW)

    assert.equal(digest.overdueTasks.total, 7)
    assert.lengthOf(digest.overdueTasks.items, 5)
  })
})

test.group('FleetDigestService.recipients (#871)', () => {
  test('admins by default, other staff on request, owners never', async ({ assert }) => {
    const { org } = await fleetOrg()
    const admin = await member(org, 'admin')
    const optedOutAdmin = await member(org, 'admin', { weeklyDigestEmail: false })
    await member(org, 'member')
    const optedInMember = await member(org, 'member', { weeklyDigestEmail: true })
    const mechanic = await member(org, 'mechanic', {
      weeklyDigestEmail: true,
      monthlyReportEmail: true,
    })
    await member(org, 'boat_owner', { weeklyDigestEmail: true })
    await member(org, 'admin', { anonymizedAt: DateTime.now() })

    const digestService = await service()
    const weeklyRecipients = await digestService.recipients(org.id, 'weekly')
    const monthlyRecipients = await digestService.recipients(org.id, 'monthly')
    const weekly = weeklyRecipients.map((r) => r.userId)
    const monthly = monthlyRecipients.map((r) => r.userId)

    assert.sameMembers(weekly, [admin.id, optedInMember.id, mechanic.id])
    assert.notInclude(weekly, optedOutAdmin.id)
    // Le rapport mensuel est financier : réservé aux admins.
    assert.sameMembers(monthly, [admin.id, optedOutAdmin.id])
  })
})

test.group('FleetDigestService.sendWeekly (#871)', (group) => {
  group.each.setup(() => {
    mail.fake()
    return () => mail.restore()
  })

  test('sends the digest once per recipient and per week', async ({ assert }) => {
    const { messages } = mail.fake()
    const { org, boat } = await fleetOrg()
    const admin = await member(org, 'admin', { locale: 'en' })
    await overdueTask(boat)

    // Le cron repasse dans la semaine : la clé de déduplication bloque le second envoi.
    // La suite partage une transaction : on ne compte que les e-mails de cet admin.
    const digestService = await service()
    await digestService.sendWeekly(NOW)
    await digestService.sendWeekly(NOW)

    const mine = messages.sent().filter((message) => message.hasTo(admin.email))
    assert.lengthOf(mine, 1)
    const [sent] = mine
    const message = sent.toObject().message
    assert.include(message.subject as string, org.name)
    assert.include(message.html as string, 'Vidange moteur')
    assert.include(message.html as string, '1 overdue task')
    assert.include(message.html as string, '/reports/digest/unsubscribe/')
    const window = weeklyDigestWindow(TODAY.toISODate()!)
    const dedup = await QueueDedupKey.findByOrFail(
      'key',
      `email:${admin.email}:fleet-digest:weekly:${org.id}:${window.week}`
    )
    assert.equal(dedup.jobName, 'SendEmail')
  })

  test('an empty week sends nothing', async ({ assert }) => {
    const { messages } = mail.fake()
    const { org } = await fleetOrg()
    await member(org, 'admin')

    const digestService = await service()
    assert.equal(await digestService.sendWeeklyFor(org, NOW), 0)
    messages.assertNoneSent()
  })

  test('each role reads only its sections — a mechanic gets no expenses', async ({ assert }) => {
    const { messages } = mail.fake()
    const { org, boat } = await fleetOrg()
    const mechanic = await member(org, 'mechanic', { weeklyDigestEmail: true })
    const window = weeklyDigestWindow(TODAY.toISODate()!)
    await BoatFuelLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      fueledAt: DateTime.fromISO(window.past.from).plus({ days: 1 }),
      totalCost: '90.00',
    }).create()

    // Seules des dépenses cette semaine : rien que le mécanicien puisse lire.
    const digestService = await service()
    assert.equal(await digestService.sendWeeklyFor(org, NOW), 0)

    await overdueTask(boat)
    assert.equal(await digestService.sendWeeklyFor(org, NOW), 1)
    const [sent] = messages.sent()
    assert.isTrue(sent.hasTo(mechanic.email))
    assert.notInclude(sent.toObject().message.html as string, 'Dépenses de la semaine passée')
  })

  test('skips organizations being deleted', async ({ assert }) => {
    const { messages } = mail.fake()
    const { org, boat } = await fleetOrg('pro', { deletionRequestedAt: DateTime.now() })
    const admin = await member(org, 'admin')
    await overdueTask(boat)

    const digestService = await service()
    const organizations = await digestService.activeOrganizations()
    const active = organizations.map((o) => o.id)
    assert.notInclude(active, org.id)
    await digestService.sendWeekly(NOW)
    assert.isFalse(messages.sent().some((message) => message.hasTo(admin.email)))
  })
})

test.group('FleetDigestService monthly report (#871)', (group) => {
  group.each.setup(() => {
    mail.fake()
    return () => mail.restore()
  })

  const lastMonth = TODAY.minus({ months: 1 }).startOf('month')

  async function monthWithActivity(boat: Boat) {
    await BoatFuelLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      fueledAt: lastMonth.plus({ days: 3 }),
      totalCost: '300.00',
    }).create()
    await BoatMaintenanceTaskFactory.apply('done')
      .merge({ boatId: boat.id, dueAt: lastMonth.plus({ days: 5 }) })
      .create()
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      dueAt: lastMonth.plus({ days: 20 }),
    }).create()
    await BoatMaintenanceEventFactory.merge({
      boatId: boat.id,
      performedAt: lastMonth.plus({ days: 6 }),
    }).create()
  }

  test('buildMonthly reads last month: costs, top categories, maintenance', async ({ assert }) => {
    const { org, boat } = await fleetOrg()
    await monthWithActivity(boat)

    const digestService = await service()
    const report = await digestService.buildMonthly(org, NOW)

    assert.equal(report.month, lastMonth.toFormat('yyyy-MM'))
    assert.equal(report.costs.fuel, 300)
    assert.deepEqual(report.topCategories, [{ category: 'fuel', amount: 300 }])
    assert.deepEqual(report.maintenance, { planned: 2, completed: 1, performed: 1 })
    assert.isNull(report.rental)
    assert.equal(report.boats[0].boatName, 'Ondine')
    assert.equal(report.boats[0].costs, 300)
  })

  test('sends the report with its PDF, once per month', async ({ assert }) => {
    const { messages } = mail.fake()
    const { org, boat } = await fleetOrg()
    const admin = await member(org, 'admin')
    await monthWithActivity(boat)

    const digestService = await service()
    assert.equal(await digestService.sendMonthlyFor(org, NOW), 1)
    assert.equal(await digestService.sendMonthlyFor(org, NOW), 0)

    messages.assertSentCount(1)
    const [sent] = messages.sent()
    assert.isTrue(sent.hasTo(admin.email))
    const message = sent.toObject().message
    assert.include(message.subject as string, 'rapport de flotte')
    const attachments = message.attachments as { filename?: string }[]
    assert.lengthOf(attachments, 1)
    assert.equal(attachments[0].filename, `rapport-flotte-${lastMonth.toFormat('yyyy-MM')}.pdf`)
  })

  test('no report on Starter, nor for an empty month', async ({ assert }) => {
    const { messages } = mail.fake()
    const starter = await fleetOrg('starter')
    await member(starter.org, 'admin')
    await monthWithActivity(starter.boat)
    const quiet = await fleetOrg('pro')
    await member(quiet.org, 'admin')

    const digestService = await service()
    assert.equal(await digestService.sendMonthlyFor(starter.org, NOW), 0)
    assert.equal(await digestService.sendMonthlyFor(quiet.org, NOW), 0)
    messages.assertNoneSent()
  })
})
