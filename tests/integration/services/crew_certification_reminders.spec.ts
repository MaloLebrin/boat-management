import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import CrewCertification from '#models/crew_certification'
import OrganizationMembership from '#models/organization_membership'
import EmailQueueService from '#services/email_queue_service'
import ReminderEmailService from '#services/reminder_email_service'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'
import type { CrewCertificationAlert } from '#shared/types/crew'

interface SentReminder {
  to: string
  locale: string | null
  certifications: CrewCertificationAlert[]
}

const inDays = (days: number) => DateTime.now().startOf('day').plus({ days })

test.group('ReminderEmailService — certifications d’équipage (#882)', (group) => {
  let sent: SentReminder[] = []

  group.each.setup(async () => {
    // La campagne lit toutes les organisations et la suite `integration` ne
    // tronque pas (transaction globale) : on repart sans certification.
    await CrewCertification.query().delete()
    sent = []
    app.container.swap(
      EmailQueueService,
      () =>
        ({
          sendReminderCrewCertificationExpiry: async (params: SentReminder) => {
            sent.push(params)
          },
        }) as unknown as EmailQueueService
    )
    return () => app.container.restore(EmailQueueService)
  })

  test('mails each admin, in their language, the certifications hitting 60/30/7 days today', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const admin = await UserFactory.merge({ organizationId: org.id, locale: 'en' }).create()
    await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
    const member = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({
      userId: member.id,
      organizationId: org.id,
      role: 'member',
    })

    const crew = await CrewMemberFactory.merge({
      organizationId: org.id,
      firstName: 'Jeanne',
      lastName: 'Barret',
    }).create()
    await CrewCertification.createMany([
      { crewMemberId: crew.id, type: 'medical_certificate', expiresAt: inDays(7) },
      { crewMemberId: crew.id, type: 'stcw_basic', expiresAt: inDays(60) },
      { crewMemberId: crew.id, type: 'vhf', expiresAt: inDays(30) },
      // Entre deux paliers, échue ou sans date : pas d'e-mail aujourd'hui.
      { crewMemberId: crew.id, type: 'crr', expiresAt: inDays(29) },
      { crewMemberId: crew.id, type: 'first_aid', expiresAt: inDays(-7) },
      { crewMemberId: crew.id, type: 'coastal_permit', expiresAt: null },
    ])

    const service = await app.container.make(ReminderEmailService)
    await service.sendCrewCertificationReminders()

    assert.lengthOf(sent, 1)
    assert.equal(sent[0]!.to, admin.email)
    assert.equal(sent[0]!.locale, 'en')
    assert.deepEqual(
      sent[0]!.certifications.map((c) => [c.type, c.expiresInDays, c.crewMemberName]),
      [
        ['medical_certificate', 7, 'Jeanne Barret'],
        ['vhf', 30, 'Jeanne Barret'],
        ['stcw_basic', 60, 'Jeanne Barret'],
      ]
    )
  })

  test('sends nothing when no certification reaches a threshold today', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
    const crew = await CrewMemberFactory.merge({ organizationId: org.id }).create()
    await CrewCertification.create({ crewMemberId: crew.id, type: 'vhf', expiresAt: inDays(12) })

    const service = await app.container.make(ReminderEmailService)
    await service.sendCrewCertificationReminders()

    assert.lengthOf(sent, 0)
  })
})
