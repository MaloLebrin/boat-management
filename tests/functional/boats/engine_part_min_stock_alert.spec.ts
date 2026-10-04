import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Seuil d'alerte des pièces moteur (#947) : la modale d'édition ne doit plus
 * effacer `min_stock_alert` — absent = inchangé, vide = effacé.
 */
test.group('Engine part min stock alert (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function setup() {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const part = await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      designation: 'Impeller',
      stock: 4,
      minStockAlert: 2,
    }).create()
    const url = `/boats/${boat.id}/engines/${engine.id}/parts/${part.id}`
    return { admin, boat, engine, part, url }
  }

  test('editing a part without the threshold keeps it', async ({ client, assert }) => {
    const { admin, part, url } = await setup()

    const response = await client
      .put(url)
      .loginAs(admin)
      .form({ designation: 'Impeller Jabsco', stock: '1' })
      .redirects(0)

    response.assertStatus(302)
    await part.refresh()
    assert.equal(part.designation, 'Impeller Jabsco')
    assert.equal(part.stock, 1)
    assert.equal(part.minStockAlert, 2)
  })

  test('the threshold can be changed and cleared from the form', async ({ client, assert }) => {
    const { admin, part, url } = await setup()

    await client.put(url).loginAs(admin).form({ designation: 'Impeller', minStockAlert: '5' })
    await part.refresh()
    assert.equal(part.minStockAlert, 5)

    await client.put(url).loginAs(admin).form({ designation: 'Impeller', minStockAlert: '' })
    await part.refresh()
    assert.isNull(part.minStockAlert)
  })

  test('a negative threshold is rejected', async ({ client, assert }) => {
    const { admin, part, url } = await setup()

    const response = await client
      .put(url)
      .loginAs(admin)
      .form({ designation: 'Impeller', minStockAlert: '-3' })
      .redirects(0)

    response.assertStatus(302)
    await part.refresh()
    assert.equal(part.minStockAlert, 2)
  })

  test('creating a part stores the threshold', async ({ client, assert }) => {
    const { admin, boat, engine } = await setup()

    await client
      .post(`/boats/${boat.id}/engines/${engine.id}/parts`)
      .loginAs(admin)
      .form({ designation: 'Filtre à huile', stock: '3', minStockAlert: '1' })

    const created = await engine.related('parts').query().where('designation', 'Filtre à huile')
    assert.lengthOf(created, 1)
    assert.equal(created[0].minStockAlert, 1)
  })

  test('the engine page exposes the threshold for the edit prefill', async ({ client, assert }) => {
    const { admin, boat, engine } = await setup()

    const page = await client
      .get(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(admin)
      .withInertia()

    const props = page.inertiaProps as { engine: { parts: { minStockAlert: number | null }[] } }
    assert.equal(props.engine.parts[0].minStockAlert, 2)
  })
})
