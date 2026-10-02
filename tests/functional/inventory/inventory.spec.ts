import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import BoatEnginePart from '#models/boat_engine_part'
import InventoryItem from '#models/inventory_item'
import InventoryMovement from '#models/inventory_movement'
import PurchaseOrder from '#models/purchase_order'
import Supplier from '#models/supplier'
import type User from '#models/user'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import {
  createAdminUser,
  createMechanicUser,
  createMemberUser,
  createStarterAdminUser,
} from '#tests/functional/helpers'

/**
 * Inventaire de pièces (#892) : garde de plan (Pro et Entreprise), rôles
 * (member gère, admin supprime, mechanic n'y a pas accès), liaison d'une
 * pièce moteur et cycle d'un bon de commande par HTTP. Les calculs de stock
 * sont figés côté service (`tests/integration/services/inventory_service.spec.ts`).
 */

async function stocked(user: User, name = 'Filtre à huile') {
  return InventoryItem.create({
    organizationId: user.organizationId!,
    name,
    unit: 'unit',
    quantity: 4,
    minQuantity: 2,
  })
}

test.group('Inventaire — accès', (group) => {
  group.each.setup(() => truncateDb())

  test('un Starter est renvoyé vers les offres', async ({ client }) => {
    const user = await createStarterAdminUser()

    const response = await client.get('/inventory').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
    response.assertFlashMessage(
      'error',
      'The parts inventory (central stock, suppliers, purchase orders) is available on the Pro and Enterprise plans.'
    )
  })

  test('un admin Pro voit la page, filtrable sur le stock bas', async ({ client, assert }) => {
    const user = await createAdminUser()
    await stocked(user)
    const low = await stocked(user, 'Anode')
    low.quantity = 1
    await low.save()

    const response = await client.get('/inventory?filter=low').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('inventory/index')
    const props = response.inertiaProps as {
      items: { id: number; isLow: boolean }[]
      lowCount: number
      canManage: boolean
      canDelete: boolean
    }
    assert.deepEqual(
      props.items.map((i) => i.id),
      [low.id]
    )
    assert.equal(props.lowCount, 1)
    assert.isTrue(props.canManage)
    assert.isTrue(props.canDelete)
  })

  test('la fiche d’un article et la page des commandes', async ({ client, assert }) => {
    const user = await createAdminUser()
    const item = await stocked(user)

    const show = await client.get(`/inventory/${item.id}`).loginAs(user).withInertia()
    show.assertStatus(200)
    show.assertInertiaComponent('inventory/show')
    const props = show.inertiaProps as { item: { id: number; quantity: number } }
    assert.equal(props.item.id, item.id)
    assert.equal(props.item.quantity, 4)

    const orders = await client.get('/inventory/orders').loginAs(user).withInertia()
    orders.assertStatus(200)
    orders.assertInertiaComponent('inventory/orders')
    const ordersProps = orders.inertiaProps as { items: { id: number }[] }
    assert.deepEqual(
      ordersProps.items.map((i) => i.id),
      [item.id]
    )
  })

  test('un mechanic n’a pas accès à l’inventaire', async ({ client }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client.get('/inventory').loginAs(mechanic).redirects(0)

    response.assertStatus(403)
  })
})

test.group('Inventaire — articles', (group) => {
  group.each.setup(() => truncateDb())

  test('un member crée un article avec son stock initial', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client
      .post('/inventory')
      .loginAs(member)
      .json({
        name: 'Turbine',
        unit: 'unit',
        minQuantity: 1,
        initialQuantity: 3,
        initialUnitCost: 22,
      })
      .redirects(0)

    response.assertFlashMessage('success', 'Item added to the inventory.')
    const item = await InventoryItem.query().firstOrFail()
    assert.equal(item.organizationId, admin.organizationId)
    assert.equal(item.quantity, 3)
    assert.equal(item.averageCost, 22)
  })

  test('un comptage écrit le mouvement et le journal d’audit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const item = await stocked(admin)

    await client
      .post(`/inventory/${item.id}/adjust`)
      .loginAs(member)
      .json({ countedQuantity: 1, note: 'Casse' })

    await item.refresh()
    assert.equal(item.quantity, 1)
    const [movement] = await InventoryMovement.query().where('inventoryItemId', item.id)
    assert.equal(movement.quantity, -3)
    assert.equal(movement.note, 'Casse')
    const audit = await AuditLog.query().where('action', 'inventory.adjust').firstOrFail()
    assert.equal(audit.entityId, item.id)
  })

  test('seul l’admin supprime, et jamais un article commandé', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const item = await stocked(admin)

    // Refus Bouncer sur une mutation : flash et retour, pas de page 403 (#458).
    const denied = await client.delete(`/inventory/${item.id}`).loginAs(member).redirects(0)
    denied.assertStatus(302)
    assert.isNotNull(await InventoryItem.find(item.id))

    const supplier = await Supplier.create({ organizationId: admin.organizationId!, name: 'S' })
    await client
      .post('/inventory/orders')
      .loginAs(admin)
      .json({ supplierId: supplier.id, lines: [{ inventoryItemId: item.id, quantity: 2 }] })

    const refused = await client.delete(`/inventory/${item.id}`).loginAs(admin).redirects(0)
    refused.assertFlashMessage('error', 'This item is on a purchase order: it cannot be deleted.')
    assert.isNotNull(await InventoryItem.find(item.id))
  })
})

test.group('Inventaire — pièces moteur', (group) => {
  group.each.setup(() => truncateDb())

  test('une pièce se relie à un article, se délie, mais jamais hors organisation', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const part = await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      designation: 'Filtre',
      stock: 6,
    }).create()
    const mine = await stocked(admin)
    const foreign = await stocked(other)
    const url = `/boats/${boat.id}/engines/${engine.id}/parts/${part.id}`

    await client
      .put(url)
      .loginAs(admin)
      .form({ designation: 'Filtre', stock: '6', inventoryItemId: String(mine.id) })
    await part.refresh()
    assert.equal(part.inventoryItemId, mine.id)

    const page = await client
      .get(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(admin)
      .withInertia()
    const props = page.inertiaProps as {
      engine: { parts: { inventoryItem: { id: number; quantity: number } | null }[] }
      inventoryOptions: { id: number }[] | null
    }
    assert.deepEqual(props.engine.parts[0].inventoryItem?.id, mine.id)
    assert.deepEqual(
      props.inventoryOptions?.map((o) => o.id),
      [mine.id]
    )

    const refused = await client
      .put(url)
      .loginAs(admin)
      .form({ designation: 'Filtre', stock: '6', inventoryItemId: String(foreign.id) })
      .redirects(0)
    refused.assertFlashMessage('error', 'Item not found.')
    await part.refresh()
    assert.equal(part.inventoryItemId, mine.id)

    await client
      .put(url)
      .loginAs(admin)
      .form({ designation: 'Filtre', stock: '6', inventoryItemId: '' })
    await part.refresh()
    assert.isNull(part.inventoryItemId)
    assert.equal(part.stock, 6, 'le stock local est intact')
  })

  test('la reprise des stocks moteur se lance depuis la page', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      designation: 'Impeller',
      reference: 'JAB-1',
      stock: 2,
    }).create()

    const response = await client.post('/inventory/import-engine-parts').loginAs(admin).redirects(0)

    response.assertFlashMessage(
      'success',
      'Import complete: 1 item(s) created, 1 engine part(s) linked.'
    )
    const [part] = await BoatEnginePart.query().where('boatEngineId', engine.id)
    assert.isNotNull(part.inventoryItemId)
    assert.isNotNull(await AuditLog.query().where('action', 'inventory.import').first())
  })
})

test.group('Inventaire — bons de commande', (group) => {
  group.each.setup(() => truncateDb())

  test('brouillon, envoi, réception : le stock suit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const item = await stocked(admin)
    const supplier = await Supplier.create({ organizationId: admin.organizationId!, name: 'S' })

    await client
      .post('/inventory/orders')
      .loginAs(member)
      .json({
        supplierId: supplier.id,
        lines: [{ inventoryItemId: item.id, quantity: 6, unitCost: 8 }],
      })
    const order = await PurchaseOrder.query().firstOrFail()
    assert.equal(order.status, 'draft')

    await client.post(`/inventory/orders/${order.id}/send`).loginAs(member)
    const received = await client
      .post(`/inventory/orders/${order.id}/receive`)
      .loginAs(member)
      .redirects(0)

    received.assertFlashMessage('success', 'Order received: stock is up to date.')
    await order.refresh()
    assert.equal(order.status, 'received')
    await item.refresh()
    assert.equal(item.quantity, 10)

    const again = await client
      .post(`/inventory/orders/${order.id}/receive`)
      .loginAs(member)
      .redirects(0)
    again.assertFlashMessage(
      'error',
      "This action is not possible in the purchase order's current status."
    )
    await item.refresh()
    assert.equal(item.quantity, 10)

    const actions = await AuditLog.query()
      .where('entityType', 'purchase_order')
      .orderBy('id', 'asc')
    assert.deepEqual(
      actions.map((a) => a.action),
      ['purchase_order.create', 'purchase_order.send', 'purchase_order.receive']
    )
  })

  test('un bateau d’une autre organisation est refusé', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const foreignBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    const item = await stocked(admin)
    const supplier = await Supplier.create({ organizationId: admin.organizationId!, name: 'S' })

    const response = await client
      .post('/inventory/orders')
      .loginAs(admin)
      .json({
        supplierId: supplier.id,
        boatId: foreignBoat.id,
        lines: [{ inventoryItemId: item.id, quantity: 1 }],
      })
      .redirects(0)

    response.assertFlashMessage('error', 'Boat not found.')
    assert.lengthOf(await PurchaseOrder.all(), 0)
  })

  test('commander les stocks bas sans article sous le seuil ne crée rien', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const supplier = await Supplier.create({ organizationId: admin.organizationId!, name: 'S' })

    const response = await client
      .post('/inventory/orders/reorder')
      .loginAs(admin)
      .json({ supplierId: supplier.id })
      .redirects(0)

    response.assertFlashMessage('error', 'No item from this supplier is below its alert threshold.')
    assert.lengthOf(await PurchaseOrder.all(), 0)
  })

  test('un fournisseur commandé ne se supprime pas', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const item = await stocked(admin)
    const supplier = await Supplier.create({ organizationId: admin.organizationId!, name: 'S' })
    await client
      .post('/inventory/orders')
      .loginAs(admin)
      .json({ supplierId: supplier.id, lines: [{ inventoryItemId: item.id, quantity: 1 }] })

    const response = await client
      .delete(`/inventory/suppliers/${supplier.id}`)
      .loginAs(admin)
      .redirects(0)

    response.assertFlashMessage('error', 'This supplier has purchase orders: it cannot be deleted.')
    assert.isNotNull(await Supplier.find(supplier.id))
  })
})
