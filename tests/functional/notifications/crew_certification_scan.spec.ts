import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import Notification from '#models/notification'
import CrewCertification from '#models/crew_certification'
import OrganizationMembership from '#models/organization_membership'
import NotificationScanService from '#services/notification_scan_service'
import NotificationService from '#services/notification_service'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'

function makeService() {
  return new NotificationScanService(new NotificationService())
}

const inDays = (days: number) => DateTime.now().startOf('day').plus({ days })

async function seedOrg() {
  const org = await OrganizationFactory.create()
  const admin = await UserFactory.merge({ organizationId: org.id }).create()
  await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
  const member = await UserFactory.merge({ organizationId: org.id }).create()
  await OrganizationMembership.create({ userId: member.id, organizationId: org.id, role: 'member' })
  return { org, admin, member }
}

async function crewNotifications(userId: number) {
  return Notification.query()
    .where('userId', userId)
    .whereLike('type', 'crew_certification.%')
    .orderBy('id', 'asc')
}

test.group('NotificationScanService — certifications d’équipage (#882)', (group) => {
  group.each.setup(() => truncateDb())

  test('one notification per crew member and state, to the admins only', async ({ assert }) => {
    const { org, admin, member } = await seedOrg()
    const jeanne = await CrewMemberFactory.merge({
      organizationId: org.id,
      firstName: 'Jeanne',
      lastName: 'Barret',
      email: 'jeanne@crew.test',
    }).create()
    await CrewCertification.createMany([
      { crewMemberId: jeanne.id, type: 'medical_certificate', expiresAt: inDays(20) },
      { crewMemberId: jeanne.id, type: 'stcw_basic', expiresAt: inDays(45) },
      { crewMemberId: jeanne.id, type: 'vhf', expiresAt: inDays(-3) },
      // Hors fenêtre et sans date : rien.
      { crewMemberId: jeanne.id, type: 'crr', expiresAt: inDays(90) },
      { crewMemberId: jeanne.id, type: 'coastal_permit', expiresAt: null },
    ])

    await makeService().run()

    const notifications = await crewNotifications(admin.id)
    assert.deepEqual(notifications.map((n) => n.type).sort(), [
      'crew_certification.expired',
      'crew_certification.expiring_soon',
    ])
    const soon = notifications.find((n) => n.type === 'crew_certification.expiring_soon')!
    assert.equal(soon.severity, 'warning')
    assert.equal(soon.actionUrl, '/crew')
    assert.include(soon.title, 'Jeanne Barret')
    // Deux certifications à renouveler, la plus proche dans 20 jours → fenêtre 30.
    assert.deepInclude(soon.metadata!, { count: 2, crewAlertKey: `${jeanne.id}:30` })
    const expired = notifications.find((n) => n.type === 'crew_certification.expired')!
    assert.equal(expired.severity, 'error')
    assert.deepInclude(expired.metadata!, { count: 1, crewAlertKey: `${jeanne.id}:expired` })

    // Le membre n'est pas l'équipier : il ne reçoit rien.
    assert.lengthOf(await crewNotifications(member.id), 0)
  })

  test('the crew member is notified too when their email is a user of the organization', async ({
    assert,
  }) => {
    const { org, member } = await seedOrg()
    const crew = await CrewMemberFactory.merge({
      organizationId: org.id,
      email: member.email.toUpperCase(),
    }).create()
    await CrewCertification.create({
      crewMemberId: crew.id,
      type: 'medical_certificate',
      expiresAt: inDays(5),
    })
    // Un utilisateur d'une autre organisation au même e-mail ne compte pas.
    const other = await seedOrg()
    await CrewMemberFactory.merge({
      organizationId: other.org.id,
      email: other.member.email,
    }).create()

    await makeService().run()

    const own = await crewNotifications(member.id)
    assert.lengthOf(own, 1)
    assert.equal(own[0]!.type, 'crew_certification.expiring_soon')
    assert.deepInclude(own[0]!.metadata!, { crewAlertKey: `${crew.id}:7` })
    assert.lengthOf(await crewNotifications(other.member.id), 0)
  })

  test('alerts once per window: same window is deduped, the next one alerts again', async ({
    assert,
  }) => {
    const { org, admin } = await seedOrg()
    const crew = await CrewMemberFactory.merge({ organizationId: org.id }).create()
    const cert = await CrewCertification.create({
      crewMemberId: crew.id,
      type: 'medical_certificate',
      expiresAt: inDays(40),
    })

    await makeService().run()
    await makeService().run()
    assert.lengthOf(await crewNotifications(admin.id), 1)

    // L'échéance entre dans la fenêtre des 30 jours : nouvelle alerte.
    cert.expiresAt = inDays(25)
    await cert.save()
    await makeService().run()
    // Puis dans celle des 7 jours.
    cert.expiresAt = inDays(6)
    await cert.save()
    await makeService().run()
    await makeService().run()

    const notifications = await crewNotifications(admin.id)
    const keys = notifications.map((n) => n.metadata!.crewAlertKey)
    assert.deepEqual(keys, [`${crew.id}:60`, `${crew.id}:30`, `${crew.id}:7`])
  })

  test('never mixes organizations', async ({ assert }) => {
    const first = await seedOrg()
    const second = await seedOrg()
    const crew = await CrewMemberFactory.merge({ organizationId: first.org.id }).create()
    await CrewCertification.create({ crewMemberId: crew.id, type: 'vhf', expiresAt: inDays(-1) })

    await makeService().run()

    assert.lengthOf(await crewNotifications(first.admin.id), 1)
    assert.lengthOf(await crewNotifications(second.admin.id), 0)
  })
})
