import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import CrewMember from '#models/crew_member'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Les quatre routes CRUD de l'équipage, au niveau HTTP (#696).
 *
 * `tests/functional/crew/` comptait deux fichiers de certifications et un de
 * validateurs (#688) : les routes `crew.index`, `crew.store`, `crew.update` et
 * `crew.destroy` n'avaient **aucune** couverture comportementale.
 *
 * Deux choses que la mesure a démenties, et qui décident de la forme des
 * assertions ci-dessous :
 *
 * - une fiche d'une autre organisation ne rend **pas un 404**, contrairement à
 *   ce qu'annonçait l'issue : `CrewService.getForOrganizationOrFail` lève, le
 *   contrôleur pose un flash et renvoie à `/crew` ;
 * - `CrewMembersController.index` autorise sur **`'create'`**, pas sur une
 *   lecture : `CrewMemberPolicy` n'a pas de méthode `view`. Lire la liste exige
 *   donc la capacité de créer. C'est sans conséquence aujourd'hui — les deux
 *   rôles qui n'ont pas `crew.create` n'ont rien à faire sur cet écran — mais un
 *   rôle en lecture seule serait refusé, et c'est figé ici pour qu'on le sache.
 */

const NOT_FOUND = 'Crew member not found.'
const ACCESS_DENIED = 'Access denied'

function validPayload(overrides: Record<string, unknown> = {}) {
  return { firstName: 'Camille', lastName: 'Ravel', email: 'camille@example.com', ...overrides }
}

/** Le témoin : les noms en base, tous organisations confondues. */
async function crewNames(): Promise<string[]> {
  const rows = await CrewMember.all()
  return rows.map((row) => `${row.firstName} ${row.lastName}`).sort()
}

test.group('Équipage — la liste ne sort pas de son organisation', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /crew ne liste que les équipiers de son organisation', async ({ client, assert }) => {
    const user = await createAdminUser()
    const outsider = await createAdminUser()
    await CrewMemberFactory.merge({
      organizationId: user.organizationId!,
      firstName: 'Camille',
      lastName: 'Ravel',
    }).create()
    await CrewMemberFactory.merge({
      organizationId: outsider.organizationId!,
      firstName: 'Pirate',
      lastName: 'Étranger',
    }).create()

    const response = await client.get('/crew').loginAs(user).withInertia()

    assertPageContract(assert, response, 'organization/crew')
    const props = response.inertiaProps as {
      crewMembers: Array<{ firstName: string }>
      canDelete: boolean
    }

    assert.lengthOf(props.crewMembers, 1)
    assert.equal(props.crewMembers[0].firstName, 'Camille')
    assert.isTrue(props.canDelete)
  })

  test('la prop `canDelete` suit le rôle, pas la simple présence', async ({ client, assert }) => {
    // C'est elle qui décide de l'affichage du bouton de suppression. Un
    // `canDelete: true` pour un member afficherait une action qui sera refusée
    // — le défaut de la famille #456.
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client.get('/crew').loginAs(member).withInertia()
    const props = response.inertiaProps as { canDelete: boolean }

    assert.isFalse(props.canDelete)
  })
})

test.group('Équipage — le cycle de vie complet', (group) => {
  group.each.setup(() => truncateDb())

  test('POST /crew crée un équipier dans son organisation', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.post('/crew').loginAs(user).form(validPayload()).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/crew')
    response.assertFlashMessage('success', 'Crew member added successfully.')

    const rows = await CrewMember.all()
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].firstName, 'Camille')
    // L'organisation est déduite de l'utilisateur, jamais lue du corps.
    assert.equal(rows[0].organizationId, user.organizationId)
  })

  test('PUT /crew/:id modifie un équipier de son organisation', async ({ client, assert }) => {
    const user = await createAdminUser()
    const member = await CrewMemberFactory.merge({
      organizationId: user.organizationId!,
      firstName: 'Camille',
    }).create()

    const response = await client
      .put(`/crew/${member.id}`)
      .loginAs(user)
      .form(validPayload({ firstName: 'Camille-Anne' }))
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Crew member updated.')

    const updated = await CrewMember.findOrFail(member.id)
    assert.equal(updated.firstName, 'Camille-Anne')
  })

  test('DELETE /crew/:id supprime un équipier de son organisation', async ({ client, assert }) => {
    const user = await createAdminUser()
    const member = await CrewMemberFactory.merge({
      organizationId: user.organizationId!,
    }).create()

    const response = await client.delete(`/crew/${member.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Crew member deleted.')
    assert.isNull(await CrewMember.find(member.id))
  })
})

test.group("Équipage — l'isolation des deux routes par identifiant", (group) => {
  group.each.setup(() => truncateDb())

  /**
   * `PUT /crew/:id` et `DELETE /crew/:id` ne portent aucune organisation dans
   * leur URL, et `CrewMemberPolicy.update`/`delete` **ne prennent pas de
   * ressource** — elles ne vérifient que la capacité. Toute l'isolation tient
   * donc au `where('organizationId', …)` de `CrewService`.
   */

  test("modifier l'équipier d'une autre organisation ne le touche pas", async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const outsider = await createAdminUser()
    const theirs = await CrewMemberFactory.merge({
      organizationId: outsider.organizationId!,
      firstName: 'Pirate',
      lastName: 'Étranger',
    }).create()
    const before = await crewNames()

    const response = await client
      .put(`/crew/${theirs.id}`)
      .loginAs(user)
      .form(validPayload({ firstName: 'Détourné' }))
      .redirects(0)

    // Ni 403 ni 404 : une redirection et un flash. L'issue annonçait un 404.
    response.assertStatus(302)
    response.assertHeader('location', '/crew')
    response.assertFlashMessage('error', NOT_FOUND)

    assert.deepEqual(await crewNames(), before, 'une fiche étrangère a été modifiée')
  })

  test("supprimer l'équipier d'une autre organisation ne le supprime pas", async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const outsider = await createAdminUser()
    const theirs = await CrewMemberFactory.merge({
      organizationId: outsider.organizationId!,
    }).create()

    const response = await client.delete(`/crew/${theirs.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/crew')
    response.assertFlashMessage('error', NOT_FOUND)
    assert.isNotNull(await CrewMember.find(theirs.id))
  })

  test('un identifiant inexistant se comporte comme un identifiant étranger', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client.delete('/crew/999999').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', NOT_FOUND)
  })
})

test.group('Équipage — la frontière des rôles', (group) => {
  group.each.setup(() => truncateDb())

  test('un member liste, crée et modifie', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const existing = await CrewMemberFactory.merge({
      organizationId: admin.organizationId!,
    }).create()

    const list = await client.get('/crew').loginAs(member)
    list.assertStatus(200)

    const created = await client.post('/crew').loginAs(member).form(validPayload()).redirects(0)
    created.assertStatus(302)
    created.assertFlashMessage('success', 'Crew member added successfully.')

    const updated = await client
      .put(`/crew/${existing.id}`)
      .loginAs(member)
      .form(validPayload({ firstName: 'Corrigé' }))
      .redirects(0)
    updated.assertStatus(302)

    const reloaded = await CrewMember.findOrFail(existing.id)
    assert.equal(reloaded.firstName, 'Corrigé')
  })

  test('… mais ne supprime pas', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const existing = await CrewMemberFactory.merge({
      organizationId: admin.organizationId!,
    }).create()

    const response = await client.delete(`/crew/${existing.id}`).loginAs(member).redirects(0)

    // Un refus d'**écriture** éjecte vers `/`, la page d'accueil marketing, dont
    // le layout ne rend aucun toast : le message n'atteint jamais l'utilisateur.
    response.assertStatus(302)
    response.assertHeader('location', '/')
    response.assertFlashMessage('error', ACCESS_DENIED)

    assert.isNotNull(await CrewMember.find(existing.id), 'un member a supprimé un équipier')
  })

  const deniedRoles = [
    { name: 'mechanic', make: createMechanicUser },
    { name: 'boat_owner', make: createBoatOwnerUser },
  ] as const

  for (const role of deniedRoles) {
    test(`un ${role.name} est refusé dès la lecture`, async ({ client }) => {
      const admin = await createAdminUser()
      const user = await role.make(admin.organizationId!)

      const response = await client.get('/crew').loginAs(user).redirects(0)

      // Une **lecture** refusée rend un 403, là où une écriture redirige.
      response.assertStatus(403)
    })

    test(`un ${role.name} ne crée pas d'équipier`, async ({ client, assert }) => {
      const admin = await createAdminUser()
      const user = await role.make(admin.organizationId!)
      const before = await crewNames()

      const response = await client.post('/crew').loginAs(user).form(validPayload()).redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/')
      assert.deepEqual(await crewNames(), before, `un ${role.name} a créé un équipier`)
    })
  }
})
