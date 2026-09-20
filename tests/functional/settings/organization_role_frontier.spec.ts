import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Organization from '#models/organization'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'

/**
 * La frontière des rôles sur les deux écrans « organisation » des réglages (#761).
 *
 * `SettingsShell` n'affiche les onglets `org` et `members` qu'à `members.view`,
 * mais le backend ne gardait ni l'un ni l'autre : un mechanic ou un boat_owner
 * qui tapait l'URL récupérait l'annuaire complet — e-mail et rôle de chaque
 * membre, plus les invitations en attente. Et `PUT /settings/org` n'appelait
 * aucune policy du tout.
 *
 * Deux frontières distinctes, et c'est tout l'objet du fichier : **ouvrir**
 * l'écran est `members.view` (admin + member), **renommer** l'organisation est
 * `organization.manage` (admin seul). Un member consulte sans réécrire.
 */
test.group('Réglages organisation — frontière des rôles (#761)', (group) => {
  group.each.setup(() => truncateDb())

  test('un mechanic ne peut pas ouvrir l’annuaire', async ({ assert, client }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client.get('/settings/members').loginAs(mechanic).withInertia()

    response.assertStatus(403)
    response.assertInertiaComponent('errors/forbidden')
    // L'assertion qui compte : aucune adresse ne doit avoir fuité au passage.
    assert.notInclude(JSON.stringify(response.inertiaProps ?? {}), admin.email)
  })

  test('un boat_owner ne peut pas ouvrir l’annuaire', async ({ assert, client }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client.get('/settings/members').loginAs(owner).withInertia()

    response.assertStatus(403)
    response.assertInertiaComponent('errors/forbidden')
    assert.notInclude(JSON.stringify(response.inertiaProps ?? {}), admin.email)
  })

  test('un member garde l’accès à l’annuaire', async ({ client }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client.get('/settings/members').loginAs(member).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('settings/members')
  })

  test('un mechanic ne peut pas ouvrir le profil de l’organisation', async ({ client }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client.get('/settings/org').loginAs(mechanic).withInertia()

    response.assertStatus(403)
    response.assertInertiaComponent('errors/forbidden')
  })

  test('un member consulte le profil de l’organisation', async ({ client }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client.get('/settings/org').loginAs(member).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('settings/org')
  })

  test('un member ne renomme pas l’organisation', async ({ assert, client }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const before = await Organization.findOrFail(admin.organizationId!)

    const response = await client
      .put('/settings/org')
      .loginAs(member)
      .form({ name: 'Pirate Yachting SARL' })
      .redirects(0)

    // Bouncer sur une soumission de formulaire : flash + redirect back, pas de 403.
    response.assertStatus(302)
    const after = await Organization.findOrFail(admin.organizationId!)
    assert.equal(after.name, before.name)
  })

  test('un mechanic ne renomme pas l’organisation', async ({ assert, client }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const before = await Organization.findOrFail(admin.organizationId!)

    const response = await client
      .put('/settings/org')
      .loginAs(mechanic)
      .form({ name: 'Pirate Yachting SARL' })
      .redirects(0)

    response.assertStatus(302)
    const after = await Organization.findOrFail(admin.organizationId!)
    assert.equal(after.name, before.name)
  })

  test('un admin renomme l’organisation', async ({ assert, client }) => {
    const admin = await createAdminUser()

    const response = await client
      .put('/settings/org')
      .loginAs(admin)
      .form({ name: 'Marina du Ponant' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    const after = await Organization.findOrFail(admin.organizationId!)
    assert.equal(after.name, 'Marina du Ponant')
  })
})
