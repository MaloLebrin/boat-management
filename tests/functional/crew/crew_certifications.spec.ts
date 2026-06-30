import { UserFactory } from '#database/factories/user_factory'
import CrewCertification from '#models/crew_certification'
import CrewMember from '#models/crew_member'
import { createAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Crew certifications (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST store crée une certification avec expiresAt ISO valide (#158)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const member = await CrewMember.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Martin',
    })

    const response = await client
      .post(`/crew/${member.id}/certifications`)
      .loginAs(user)
      .form({ type: 'vhf', expiresAt: '2025-01-15' })

    response.assertRedirectsTo('/crew')

    const cert = await CrewCertification.query().where('crewMemberId', member.id).firstOrFail()

    assert.equal(cert.type, 'vhf')
    assert.isNotNull(cert.expiresAt)
    assert.equal(cert.expiresAt!.toISODate(), '2025-01-15')
  })

  test('POST store crée une certification sans expiresAt', async ({ client, assert }) => {
    const user = await createAdminUser()
    const member = await CrewMember.create({
      organizationId: user.organizationId!,
      firstName: 'Bob',
      lastName: 'Dupont',
    })

    const response = await client
      .post(`/crew/${member.id}/certifications`)
      .loginAs(user)
      .form({ type: 'stcw_basic' })

    response.assertRedirectsTo('/crew')

    const cert = await CrewCertification.query().where('crewMemberId', member.id).firstOrFail()

    assert.equal(cert.type, 'stcw_basic')
    assert.isNull(cert.expiresAt)
  })

  test('POST store renvoie erreur pour un membre hors organisation (IDOR)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const otherUser = await UserFactory.with('organization').create()
    const foreignMember = await CrewMember.create({
      organizationId: otherUser.organizationId!,
      firstName: 'Eve',
      lastName: 'Evil',
    })

    const response = await client
      .post(`/crew/${foreignMember.id}/certifications`)
      .loginAs(user)
      .form({ type: 'vhf' })

    response.assertRedirectsTo('/crew')

    const count = await CrewCertification.query()
      .where('crewMemberId', foreignMember.id)
      .count('* as total')

    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('DELETE destroy supprime une certification existante', async ({ client, assert }) => {
    const user = await createAdminUser()
    const member = await CrewMember.create({
      organizationId: user.organizationId!,
      firstName: 'Charlie',
      lastName: 'Lebrun',
    })
    const cert = await CrewCertification.create({
      crewMemberId: member.id,
      type: 'coastal_permit',
      referenceNumber: null,
      expiresAt: null,
    })

    const response = await client
      .delete(`/crew/${member.id}/certifications/${cert.id}`)
      .loginAs(user)

    response.assertRedirectsTo('/crew')

    const deleted = await CrewCertification.find(cert.id)
    assert.isNull(deleted)
  })
})
