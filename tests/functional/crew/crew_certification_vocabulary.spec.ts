import { UserFactory } from '#database/factories/user_factory'
import CrewCertification from '#models/crew_certification'
import CrewMember from '#models/crew_member'
import Client from '#models/client'
import OrganizationMembership from '#models/organization_membership'
import { createAdminUser } from '#tests/functional/helpers'
import { NAVIGATION_TITLES } from '#shared/types/navigation_title'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

/**
 * Vocabulaire partagé des titres de navigation (#585) : mêmes valeurs pour les
 * certifications d'équipage et les permis clients, et aucune valeur historique
 * invalidée.
 */
test.group('Vocabulaire des titres de navigation (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  /** Les fiches clients relèvent du module CRM : plan Enterprise requis. */
  async function createEnterpriseAdminUser() {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'enterprise' })
    ).create()
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId!,
      role: 'admin',
    })
    return user
  }

  async function createMember() {
    const user = await createAdminUser()
    const member = await CrewMember.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Martin',
    })
    return { user, member }
  }

  test('accepte chacun des titres du vocabulaire partagé', async ({ client, assert }) => {
    const { user, member } = await createMember()

    for (const type of NAVIGATION_TITLES) {
      const response = await client
        .post(`/crew/${member.id}/certifications`)
        .loginAs(user)
        .form({ type })

      response.assertRedirectsTo('/crew')
    }

    const stored = await CrewCertification.query().where('crewMemberId', member.id)
    assert.sameMembers(
      stored.map((c) => c.type),
      [...NAVIGATION_TITLES]
    )
  })

  test('accepte encore les valeurs déjà en base avant #585', async ({ client, assert }) => {
    const { user, member } = await createMember()

    for (const type of ['coastal_permit', 'offshore_permit', 'vhf', 'stcw_basic'] as const) {
      const response = await client
        .post(`/crew/${member.id}/certifications`)
        .loginAs(user)
        .form({ type })

      response.assertRedirectsTo('/crew')
    }

    assert.equal(
      await CrewCertification.query()
        .where('crewMemberId', member.id)
        .count('* as t')
        .then((r) => Number((r[0] as unknown as { $extras: { t: string } }).$extras.t)),
      4
    )
  })

  test('refuse un titre hors vocabulaire', async ({ client, assert }) => {
    const { user, member } = await createMember()

    await client
      .post(`/crew/${member.id}/certifications`)
      .loginAs(user)
      .form({ type: 'jet_ski_licence' })

    assert.isNull(await CrewCertification.query().where('crewMemberId', member.id).first())
  })

  test('un permis client accepte un titre du vocabulaire partagé', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client.post('/clients').loginAs(user).form({
      firstName: 'Jean',
      lastName: 'Dupont',
      navigationPermitType: 'captain_200',
    })

    response.assertRedirectsTo('/clients')

    const stored = await Client.query().where('organizationId', user.organizationId!).firstOrFail()
    assert.equal(stored.navigationPermitType, 'captain_200')
  })

  test('un permis client accepte « aucun permis »', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client.post('/clients').loginAs(user).form({
      firstName: 'Jean',
      lastName: 'Dupont',
      navigationPermitType: 'none',
    })

    const stored = await Client.query().where('organizationId', user.organizationId!).firstOrFail()
    assert.equal(stored.navigationPermitType, 'none')
  })

  test('une fiche client portant une valeur historique reste modifiable', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const existing = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Marc',
      lastName: 'Legrand',
      // Valeur écrite avant #585 : elle doit rester acceptée en update.
      navigationPermitType: 'coastal',
    })

    await client.put(`/clients/${existing.id}`).loginAs(user).form({
      firstName: 'Marc',
      lastName: 'Legrand',
      navigationPermitType: 'coastal',
    })

    await existing.refresh()
    assert.equal(existing.navigationPermitType, 'coastal')
  })

  test('refuse un permis client hors vocabulaire', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client.post('/clients').loginAs(user).form({
      firstName: 'Jean',
      lastName: 'Dupont',
      navigationPermitType: 'jet_ski_licence',
    })

    assert.isNull(await Client.query().where('organizationId', user.organizationId!).first())
  })

  test('une certification reste inaccessible hors organisation', async ({ client, assert }) => {
    const user = await createAdminUser()
    const otherUser = await UserFactory.with('organization').create()
    const foreignMember = await CrewMember.create({
      organizationId: otherUser.organizationId!,
      firstName: 'Eve',
      lastName: 'Evil',
    })

    await client
      .post(`/crew/${foreignMember.id}/certifications`)
      .loginAs(user)
      .form({ type: 'crr' })

    assert.isNull(await CrewCertification.query().where('crewMemberId', foreignMember.id).first())
  })
})
