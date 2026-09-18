import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Pontoon from '#models/pontoon'
import Spot from '#models/spot'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { PortFactory } from '#database/factories/port_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import {
  createBoatOwnerUser,
  createEnterpriseAdminUser,
  createMechanicUser,
  createMemberUser,
  createStarterAdminUser,
} from '#tests/functional/helpers'
import type { ApiClient, ApiResponse } from '@japa/api-client'
import type User from '#models/user'

/**
 * La frontière des rôles sur la marina, au niveau HTTP (#695).
 *
 * Tout se joue dans une organisation **Entreprise** : sans cela, le refus
 * observé serait celui de `requirePortsPlan`, qui passe avant la policy, et le
 * fichier changerait de sujet sans rien dire. Le dernier cas met les deux
 * refus côte à côte, justement parce qu'ils se ressemblent.
 *
 * ⚠️ Le cas `member` est une **caractérisation** (#719) : la matrice de
 * permissions lui accorde `spots.view`, `spots.create` et `spots.edit`, mais
 * aucune route ne lit `SpotPolicy` — `SpotsController` autorise via
 * `PortPolicy`, donc `ports.create/edit/delete`, qui sont admin-only. Ces
 * capacités sont inatteignables, et le member est refusé sur les trois
 * écritures. Ces tests tomberont le jour où #719 sera tranchée.
 */

/** Le refus d'autorisation, mesuré : 302 vers l'accueil marketing. */
const ACCESS_DENIED = 'Access denied'

/** Le refus de plan, mesuré : 302 vers la facturation. */
const PLAN_UPSELL_PATH = '/settings/billing'

interface MarinaDecor {
  portId: number
  pontoonId: number
  spotId: number
}

async function seedMarina(organizationId: number): Promise<MarinaDecor> {
  const port = await PortFactory.merge({ organizationId }).create()
  const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
  const spot = await SpotFactory.merge({
    organizationId,
    pontoonId: pontoon.id,
    name: 'B12',
  }).create()

  return { portId: port.id, pontoonId: pontoon.id, spotId: spot.id }
}

/** Tout ce que ces routes savent écrire, photographié d'un bloc. */
async function marinaState() {
  const [spots, pontoons] = await Promise.all([Spot.all(), Pontoon.all()])

  return {
    spots: spots.length,
    names: spots.map((spot) => spot.name).sort(),
    positions: pontoons.map((pontoon) => `${pontoon.positionX}/${pontoon.positionY}`).sort(),
  }
}

interface Face {
  name: string
  run: (client: ApiClient, user: User, decor: MarinaDecor) => Promise<ApiResponse>
}

/** Les cinq écritures du domaine qu'un non-admin peut tenter. */
const WRITE_FACES: Face[] = [
  {
    name: 'créer une place sous un ponton',
    run: (client, user, decor) =>
      client
        .post(`/ports/${decor.portId}/pontoons/${decor.pontoonId}/spots`)
        .loginAs(user)
        .form({ name: 'PIRATE' })
        .redirects(0),
  },
  {
    name: 'renommer une place',
    run: (client, user, decor) =>
      client.put(`/spots/${decor.spotId}`).loginAs(user).form({ name: 'PIRATE' }).redirects(0),
  },
  {
    name: 'supprimer une place',
    run: (client, user, decor) =>
      client.delete(`/spots/${decor.spotId}`).loginAs(user).redirects(0),
  },
  {
    name: 'déplacer un ponton sur le plan',
    run: (client, user, decor) =>
      client
        .patch(`/ports/${decor.portId}/pontoons/${decor.pontoonId}/position`)
        .loginAs(user)
        .form({ x: 120, y: 240 })
        .redirects(0),
  },
  {
    name: 'créer un ponton',
    run: (client, user, decor) =>
      client
        .post(`/ports/${decor.portId}/pontoons`)
        .loginAs(user)
        .form({ name: 'Ponton pirate' })
        .redirects(0),
  },
]

test.group('Marina — un member est refusé sur toutes les écritures (#719)', (group) => {
  group.each.setup(() => truncateDb())

  for (const face of WRITE_FACES) {
    test(`« ${face.name} » est refusé à un member`, async ({ client, assert }) => {
      const admin = await createEnterpriseAdminUser()
      const member = await createMemberUser(admin.organizationId!)
      const decor = await seedMarina(admin.organizationId!)
      const before = await marinaState()

      const response = await face.run(client, member, decor)

      // Le refus d'autorisation éjecte vers `/`, la page d'accueil **marketing**,
      // dont le layout ne rend aucun toast : le message ne parvient jamais à
      // l'utilisateur. Même défaut que celui corrigé en #456 pour le gating de
      // module, resté entier sur le chemin des autorisations.
      response.assertStatus(302)
      response.assertHeader('location', '/')
      response.assertFlashMessage('error', ACCESS_DENIED)

      assert.deepEqual(
        await marinaState(),
        before,
        `un member a modifié la marina en tentant « ${face.name} »`
      )
    })
  }

  test('il a pourtant les capacités `spots.*` que la matrice lui promet', async ({
    client,
    assert,
  }) => {
    // Le cœur de #719 : la capacité est bien accordée côté matrice, elle n'est
    // simplement lue par aucune route. C'est ce test qui nomme la divergence —
    // les cinq précédents ne montrent qu'un refus, sans dire pourquoi il
    // surprend.
    const admin = await createEnterpriseAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    assert.isTrue(
      await member.hasPermission(member.organizationId!, 'spots.create'),
      'la matrice a changé : ce fichier doit être relu avec #719'
    )
    assert.isFalse(await member.hasPermission(member.organizationId!, 'ports.create'))

    // Et c'est `ports.create` — via `PortPolicy` — que `SpotsController` lit.
    const decor = await seedMarina(admin.organizationId!)
    const response = await client
      .post(`/ports/${decor.portId}/pontoons/${decor.pontoonId}/spots`)
      .loginAs(member)
      .form({ name: 'PIRATE' })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await Spot.all(), 1)
  })

  test("l'admin de la même organisation, lui, écrit sans difficulté", async ({
    client,
    assert,
  }) => {
    // Le contre-exemple indispensable : sans lui, un refus **global** — un
    // middleware trop large, une organisation mal montée — passerait pour la
    // frontière de rôle qu'on croit mesurer.
    const admin = await createEnterpriseAdminUser()
    const decor = await seedMarina(admin.organizationId!)

    const response = await client
      .post(`/ports/${decor.portId}/pontoons/${decor.pontoonId}/spots`)
      .loginAs(admin)
      .form({ name: 'B13' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    assert.lengthOf(await Spot.all(), 2)
  })
})

test.group('Marina — mechanic et boat_owner n’y ont aucune prise', (group) => {
  group.each.setup(() => truncateDb())

  const roles = [
    { name: 'mechanic', make: createMechanicUser },
    { name: 'boat_owner', make: createBoatOwnerUser },
  ] as const

  for (const role of roles) {
    test(`⚠️ un ${role.name} voit pourtant toute la marina (#723)`, async ({ client, assert }) => {
      // **Caractérisation, pas validation.** `PortsController.index` et
      // `show` n'appellent aucun `bouncer.authorize` — seuls le scoping
      // d'organisation les protège. La capacité `ports.view` existe et n'est
      // lue nulle part.
      //
      // Le cas sérieux est `boat_owner`, dont le jeu de capacités est
      // **volontairement vide** pour qu'il ne touche aucun écran staff : la
      // page du port lui sert les pontons, les places, et la liste nominative
      // des bateaux de l'organisation. Ces deux cas tomberont quand #723 sera
      // corrigée, et diront où.
      const admin = await createEnterpriseAdminUser()
      const user = await role.make(admin.organizationId!)
      const decor = await seedMarina(admin.organizationId!)

      const index = await client.get('/ports').loginAs(user)
      index.assertStatus(200)

      const show = await client.get(`/ports/${decor.portId}`).loginAs(user).withInertia()
      show.assertStatus(200)
      assert.property(show.inertiaProps as Record<string, unknown>, 'boats')
    })

    test(`un ${role.name} ne crée pas de place`, async ({ client, assert }) => {
      const admin = await createEnterpriseAdminUser()
      const user = await role.make(admin.organizationId!)
      const decor = await seedMarina(admin.organizationId!)
      const before = await marinaState()

      const response = await client
        .post(`/ports/${decor.portId}/pontoons/${decor.pontoonId}/spots`)
        .loginAs(user)
        .form({ name: 'PIRATE' })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/')

      assert.deepEqual(await marinaState(), before, `un ${role.name} a modifié la marina`)
    })

    test(`un ${role.name} ne déplace pas un ponton`, async ({ client, assert }) => {
      const admin = await createEnterpriseAdminUser()
      const user = await role.make(admin.organizationId!)
      const decor = await seedMarina(admin.organizationId!)
      const before = await marinaState()

      const response = await client
        .patch(`/ports/${decor.portId}/pontoons/${decor.pontoonId}/position`)
        .loginAs(user)
        .form({ x: 120, y: 240 })
        .redirects(0)

      response.assertStatus(302)
      assert.deepEqual(await marinaState(), before, `un ${role.name} a déplacé un ponton`)
    })
  }
})

test.group('Marina — les deux refus qu’il ne faut pas confondre', (group) => {
  group.each.setup(() => truncateDb())

  test('le plan renvoie à la facturation, le rôle à la page d’accueil', async ({
    client,
    assert,
  }) => {
    // Même requête, deux acteurs, deux destinations. Les confondre, c'est
    // croire couvrir une garde alors qu'on mesure l'autre : c'est exactement ce
    // qu'un test écrit dans une organisation Starter ferait sans le savoir.
    const starterAdmin = await createStarterAdminUser()
    const starterDecor = await seedMarina(starterAdmin.organizationId!)

    const byPlan = await client
      .post(`/ports/${starterDecor.portId}/pontoons/${starterDecor.pontoonId}/spots`)
      .loginAs(starterAdmin)
      .form({ name: 'PIRATE' })
      .redirects(0)

    byPlan.assertStatus(302)
    byPlan.assertHeader('location', PLAN_UPSELL_PATH)

    const enterpriseAdmin = await createEnterpriseAdminUser()
    const member = await createMemberUser(enterpriseAdmin.organizationId!)
    const enterpriseDecor = await seedMarina(enterpriseAdmin.organizationId!)

    const byRole = await client
      .post(`/ports/${enterpriseDecor.portId}/pontoons/${enterpriseDecor.pontoonId}/spots`)
      .loginAs(member)
      .form({ name: 'PIRATE' })
      .redirects(0)

    byRole.assertStatus(302)
    byRole.assertHeader('location', '/')
    byRole.assertFlashMessage('error', ACCESS_DENIED)

    // Et dans les deux cas, rien n'a été écrit : deux décors, deux places.
    assert.lengthOf(await Spot.all(), 2)
  })
})
