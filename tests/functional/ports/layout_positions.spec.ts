import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Mouillage from '#models/mouillage'
import Pontoon from '#models/pontoon'
import { MouillageFactory } from '#database/factories/mouillage_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { PortFactory } from '#database/factories/port_factory'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import { MARINA_CANVAS_HEIGHT, MARINA_CANVAS_WIDTH } from '#shared/constants/marina_layout'

/**
 * Le glisser-déposer du plan de marina — la moitié que les specs existantes ne
 * couvraient pas (#695).
 *
 * `pontoons.spec.ts` et `mouillages.spec.ts` prouvent déjà le cas passant et
 * les deux refus de validation (coordonnées négatives, hors canvas). Ce fichier
 * prend ce qui restait : **l'isolation** — les deux routes acceptent un
 * `:portId` et un `:pontoonId` indépendants, donc deux occasions de se tromper
 * de propriétaire — et **les bornes exactes**, un point loin à l'intérieur du
 * canvas ne disant rien de l'endroit où le validateur coupe.
 */

interface Layout {
  portId: number
  pontoonId: number
  mouillageId: number
}

async function seedLayout(organizationId: number): Promise<Layout> {
  const port = await PortFactory.merge({ organizationId }).create()
  const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
  const mouillage = await MouillageFactory.merge({ portId: port.id }).create()

  return { portId: port.id, pontoonId: pontoon.id, mouillageId: mouillage.id }
}

test.group('Plan de marina — isolation du repositionnement', (group) => {
  group.each.setup(() => truncateDb())

  test("le ponton d'une autre organisation ne bouge pas", async ({ client, assert }) => {
    const owner = await createEnterpriseAdminUser()
    const attacker = await createEnterpriseAdminUser()
    const layout = await seedLayout(owner.organizationId!)

    const response = await client
      .patch(`/ports/${layout.portId}/pontoons/${layout.pontoonId}/position`)
      .loginAs(attacker)
      .form({ x: 120, y: 240 })
      .redirects(0)

    // `PortService.getForUserOrFail` est la première chose que fait le
    // contrôleur : le port n'existe pas *pour cet utilisateur*, on repart de la
    // liste.
    response.assertStatus(302)
    response.assertHeader('location', '/ports')

    const untouched = await Pontoon.findOrFail(layout.pontoonId)
    assert.isNull(untouched.positionX)
    assert.isNull(untouched.positionY)
  })

  test("le mouillage d'une autre organisation non plus", async ({ client, assert }) => {
    const owner = await createEnterpriseAdminUser()
    const attacker = await createEnterpriseAdminUser()
    const layout = await seedLayout(owner.organizationId!)

    const response = await client
      .patch(`/ports/${layout.portId}/mouillages/${layout.mouillageId}/position`)
      .loginAs(attacker)
      .form({ x: 120, y: 240 })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/ports')

    const untouched = await Mouillage.findOrFail(layout.mouillageId)
    assert.isNull(untouched.positionX)
    assert.isNull(untouched.positionY)
  })

  test("un ponton d'un autre port de ma propre organisation ne bouge pas non plus", async ({
    client,
    assert,
  }) => {
    // Les deux ports sont à moi : seul le couple (port, ponton) est faux. C'est
    // le cas que l'isolation d'organisation ne couvre pas, et le seul que
    // `PontoonService.getForUserOrFail` attrape — il filtre sur les **deux**.
    const user = await createEnterpriseAdminUser()
    const a = await seedLayout(user.organizationId!)
    const b = await seedLayout(user.organizationId!)

    const response = await client
      .patch(`/ports/${a.portId}/pontoons/${b.pontoonId}/position`)
      .loginAs(user)
      .form({ x: 120, y: 240 })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/ports/${a.portId}`)

    const untouched = await Pontoon.findOrFail(b.pontoonId)
    assert.isNull(untouched.positionX)
  })
})

test.group('Plan de marina — les bornes exactes du canvas', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * Le validateur est `min(0).max(MARINA_CANVAS_WIDTH)` : les deux bornes sont
   * **inclusives**. Les specs existantes n'éprouvent que `-10` et
   * `WIDTH + 100` — des points si loin du bord qu'ils resteraient refusés même
   * si la coupure se déplaçait de plusieurs dizaines de pixels.
   */

  test('le coin exact du canvas est accepté', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const layout = await seedLayout(user.organizationId!)

    const response = await client
      .patch(`/ports/${layout.portId}/pontoons/${layout.pontoonId}/position`)
      .loginAs(user)
      .form({ x: MARINA_CANVAS_WIDTH, y: MARINA_CANVAS_HEIGHT })
      .redirects(0)

    response.assertStatus(302)

    const moved = await Pontoon.findOrFail(layout.pontoonId)
    assert.equal(moved.positionX, MARINA_CANVAS_WIDTH)
    assert.equal(moved.positionY, MARINA_CANVAS_HEIGHT)
  })

  test('un pixel au-delà ne l’est pas', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const layout = await seedLayout(user.organizationId!)

    const response = await client
      .patch(`/ports/${layout.portId}/pontoons/${layout.pontoonId}/position`)
      .loginAs(user)
      .form({ x: MARINA_CANVAS_WIDTH + 1, y: MARINA_CANVAS_HEIGHT })
      .redirects(0)

    response.assertStatus(302)

    const untouched = await Pontoon.findOrFail(layout.pontoonId)
    assert.isNull(untouched.positionX)
    assert.isNull(untouched.positionY)
  })

  test("l'origine est acceptée, elle aussi", async ({ client, assert }) => {
    // `min(0)` est inclusif : `0` doit passer. Un `min(1)` posé par distraction
    // rendrait le coin haut-gauche inatteignable au glisser-déposer, ce qu'un
    // test à `-10` ne dirait jamais.
    const user = await createEnterpriseAdminUser()
    const layout = await seedLayout(user.organizationId!)

    await client
      .patch(`/ports/${layout.portId}/mouillages/${layout.mouillageId}/position`)
      .loginAs(user)
      .form({ x: 0, y: 0 })
      .redirects(0)

    const moved = await Mouillage.findOrFail(layout.mouillageId)
    assert.equal(moved.positionX, 0)
    assert.equal(moved.positionY, 0)
  })

  test('une abscisse seule ne déplace rien à moitié', async ({ client, assert }) => {
    // Les deux coordonnées sont requises : un payload partiel doit être refusé
    // **en bloc**, sinon un ponton se retrouverait avec un `x` neuf et un `y`
    // d'avant — position que personne n'a demandée.
    const user = await createEnterpriseAdminUser()
    const layout = await seedLayout(user.organizationId!)

    await client
      .patch(`/ports/${layout.portId}/pontoons/${layout.pontoonId}/position`)
      .loginAs(user)
      .form({ x: 120 })
      .redirects(0)

    const untouched = await Pontoon.findOrFail(layout.pontoonId)
    assert.isNull(untouched.positionX)
    assert.isNull(untouched.positionY)
  })

  test('un déplacement en écrase un précédent', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const layout = await seedLayout(user.organizationId!)

    await client
      .patch(`/ports/${layout.portId}/pontoons/${layout.pontoonId}/position`)
      .loginAs(user)
      .form({ x: 10, y: 20 })
      .redirects(0)

    await client
      .patch(`/ports/${layout.portId}/pontoons/${layout.pontoonId}/position`)
      .loginAs(user)
      .form({ x: 30, y: 40 })
      .redirects(0)

    const moved = await Pontoon.findOrFail(layout.pontoonId)
    assert.equal(moved.positionX, 30)
    assert.equal(moved.positionY, 40)
  })
})
