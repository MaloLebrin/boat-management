import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Pontoon from '#models/pontoon'
import Spot from '#models/spot'
import { MouillageFactory } from '#database/factories/mouillage_factory'
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
 * La frontière des rôles sur la marina, au niveau HTTP (#695, #719).
 *
 * Tout se joue dans une organisation **Entreprise** : sans cela, le refus
 * observé serait celui de `requirePortsPlan`, qui passe avant la policy, et le
 * fichier changerait de sujet sans rien dire. Le dernier cas met les deux
 * refus côte à côte, justement parce qu'ils se ressemblent.
 *
 * Le member tient ce que la matrice lui promet (#719) : les routes de place
 * lisent `SpotPolicy`, donc `spots.create` et `spots.edit`, qu'il a. La
 * suppression (`spots.delete`) et toute l'infrastructure — ports, pontons,
 * mouillages, positions — restent admin-only via `PortPolicy`.
 */

/** Le refus d'autorisation, mesuré : 302 vers l'accueil marketing. */
const ACCESS_DENIED = 'Access denied'

/** Le refus de plan, mesuré : 302 vers la facturation. */
const PLAN_UPSELL_PATH = '/settings/billing'

interface MarinaDecor {
  portId: number
  pontoonId: number
  mouillageId: number
  spotId: number
}

async function seedMarina(organizationId: number): Promise<MarinaDecor> {
  const port = await PortFactory.merge({ organizationId }).create()
  const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
  const mouillage = await MouillageFactory.merge({ portId: port.id }).create()
  const spot = await SpotFactory.merge({
    organizationId,
    pontoonId: pontoon.id,
    name: 'B12',
  }).create()

  return { portId: port.id, pontoonId: pontoon.id, mouillageId: mouillage.id, spotId: spot.id }
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

/** Les écritures que la matrice réserve à l'admin. */
const ADMIN_ONLY_FACES: Face[] = [
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

test.group('Marina — un member gère les places, pas l’infrastructure (#719)', (group) => {
  group.each.setup(() => truncateDb())

  async function memberWithMarina() {
    const admin = await createEnterpriseAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const decor = await seedMarina(admin.organizationId!)
    return { member, decor }
  }

  test('un member crée une place sous un ponton', async ({ client, assert }) => {
    const { member, decor } = await memberWithMarina()

    const response = await client
      .post(`/ports/${decor.portId}/pontoons/${decor.pontoonId}/spots`)
      .loginAs(member)
      .form({ name: 'B13' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    const created = await Spot.findByOrFail('name', 'B13')
    assert.equal(created.pontoonId, decor.pontoonId)
  })

  test('un member crée une place sous un mouillage', async ({ client, assert }) => {
    const { member, decor } = await memberWithMarina()

    const response = await client
      .post(`/ports/${decor.portId}/mouillages/${decor.mouillageId}/spots`)
      .loginAs(member)
      .form({ name: 'M1' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    const created = await Spot.findByOrFail('name', 'M1')
    assert.equal(created.mouillageId, decor.mouillageId)
  })

  test('un member renomme une place', async ({ client, assert }) => {
    const { member, decor } = await memberWithMarina()

    const response = await client
      .put(`/spots/${decor.spotId}`)
      .loginAs(member)
      .form({ name: 'B12-bis' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    const spot = await Spot.findOrFail(decor.spotId)
    assert.equal(spot.name, 'B12-bis')
  })

  for (const face of ADMIN_ONLY_FACES) {
    test(`« ${face.name} » est refusé à un member`, async ({ client, assert }) => {
      const { member, decor } = await memberWithMarina()
      const before = await marinaState()

      const response = await face.run(client, member, decor)

      // Le refus d'autorisation éjecte vers `/`, la page d'accueil **marketing**,
      // dont le layout ne rend aucun toast : le message ne parvient jamais à
      // l'utilisateur. C'est pourquoi le front ne propose plus ces actions à
      // qui ne peut pas les faire (`SpotsManager`, #719).
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

  test('la place d’une autre organisation reste introuvable pour un member', async ({
    client,
    assert,
  }) => {
    // La capacité ne suffit pas : `PUT`/`DELETE /spots/:id` n'ont aucun port
    // dans l'URL, et c'est le scoping du service qui les isole.
    const { member } = await memberWithMarina()
    const otherAdmin = await createEnterpriseAdminUser()
    const foreign = await seedMarina(otherAdmin.organizationId!)
    const before = await marinaState()

    const response = await client
      .put(`/spots/${foreign.spotId}`)
      .loginAs(member)
      .form({ name: 'PIRATE' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/ports')
    assert.deepEqual(await marinaState(), before)
  })

  test("l'admin de la même organisation supprime une place", async ({ client, assert }) => {
    // Le contre-exemple indispensable : sans lui, un refus **global** — un
    // middleware trop large, une organisation mal montée — passerait pour la
    // frontière de rôle qu'on croit mesurer.
    const admin = await createEnterpriseAdminUser()
    const decor = await seedMarina(admin.organizationId!)

    const response = await client.delete(`/spots/${decor.spotId}`).loginAs(admin).redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    assert.lengthOf(await Spot.all(), 0)
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

    // Le refus de rôle se mesure sur un mechanic : depuis #719, un member a
    // `spots.create` et cette même requête lui réussirait.
    const enterpriseAdmin = await createEnterpriseAdminUser()
    const mechanic = await createMechanicUser(enterpriseAdmin.organizationId!)
    const enterpriseDecor = await seedMarina(enterpriseAdmin.organizationId!)

    const byRole = await client
      .post(`/ports/${enterpriseDecor.portId}/pontoons/${enterpriseDecor.pontoonId}/spots`)
      .loginAs(mechanic)
      .form({ name: 'PIRATE' })
      .redirects(0)

    byRole.assertStatus(302)
    byRole.assertHeader('location', '/')
    byRole.assertFlashMessage('error', ACCESS_DENIED)

    // Et dans les deux cas, rien n'a été écrit : deux décors, deux places.
    assert.lengthOf(await Spot.all(), 2)
  })
})
