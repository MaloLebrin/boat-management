import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import BoatBudgetEntry from '#models/boat_budget_entry'
import BoatEnginePart from '#models/boat_engine_part'
import InventoryItem from '#models/inventory_item'
import InventoryMovement from '#models/inventory_movement'
import Supplier from '#models/supplier'
import type User from '#models/user'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import InventoryService from '#services/inventory_service'
import PurchaseOrderService from '#services/purchase_order_service'
import { PurchaseOrderTransitionError } from '#exceptions/inventory_errors'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'

/**
 * Stock central (#892) : la quantité d'un article est la somme de son
 * journal, l'entretien en sort ce qu'il consomme, la réception d'une commande
 * y fait entrer la livraison. Chaque propriété figée ici est un écart
 * d'inventaire si elle casse.
 */

async function fleet() {
  const user = await UserFactory.with('organization').create()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
  await boat.load('engines')
  return { user, boat, engine }
}

async function item(user: User, attrs: Partial<InventoryItem> = {}) {
  const inventory = await app.container.make(InventoryService)
  const created = await inventory.create(user, {
    name: 'Filtre à gasoil',
    minQuantity: 2,
    initialQuantity: (attrs.quantity as number | undefined) ?? 5,
    initialUnitCost: 10,
  })
  return InventoryItem.findOrFail(created.id)
}

test.group('InventoryService — mouvements', () => {
  test('le stock initial est un mouvement d’ajustement valorisé', async ({ assert }) => {
    const { user } = await fleet()
    const filter = await item(user)

    assert.equal(filter.quantity, 5)
    assert.equal(filter.averageCost, 10)
    const movements = await InventoryMovement.query().where('inventoryItemId', filter.id)
    assert.lengthOf(movements, 1)
    assert.equal(movements[0].reason, 'adjustment')
    assert.equal(movements[0].quantity, 5)
  })

  test('un comptage écrit l’écart, et rien s’il ne change rien', async ({ assert }) => {
    const { user } = await fleet()
    const filter = await item(user)
    const inventory = await app.container.make(InventoryService)

    const first = await inventory.adjust(user, filter.id, { countedQuantity: 3 })
    const second = await inventory.adjust(user, filter.id, { countedQuantity: 3 })

    assert.equal(first.delta, -2)
    assert.equal(second.delta, 0)
    await filter.refresh()
    assert.equal(filter.quantity, 3)
    assert.lengthOf(await InventoryMovement.query().where('inventoryItemId', filter.id), 2)
  })

  test('un article d’une autre organisation est introuvable', async ({ assert }) => {
    const { user } = await fleet()
    const other = await fleet()
    const foreign = await item(other.user)
    const inventory = await app.container.make(InventoryService)

    await assert.rejects(() => inventory.adjust(user, foreign.id, { countedQuantity: 0 }))
  })
})

test.group('InventoryService — entretien', () => {
  test('une pièce reliée sort du stock central, pas de son stock local', async ({ assert }) => {
    const { user, boat, engine } = await fleet()
    const filter = await item(user)
    const part = await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      designation: 'Filtre à gasoil',
      stock: 9,
      inventoryItemId: filter.id,
    } as Partial<BoatEnginePart>).create()
    const loose = await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      designation: 'Turbine',
      stock: 4,
    }).create()

    const maintenance = await app.container.make(BoatMaintenanceService)
    const event = await maintenance.createForBoat(user, boat, {
      subject: 'other',
      performedAt: '2026-09-30',
      title: 'Vidange',
      parts: [
        { name: 'Filtre à gasoil', quantity: '2', enginePartId: part.id },
        { name: 'Turbine', quantity: '1', enginePartId: loose.id },
      ],
    })

    await filter.refresh()
    await part.refresh()
    await loose.refresh()
    assert.equal(filter.quantity, 3)
    assert.equal(part.stock, 9, 'le stock local d’une pièce reliée ne bouge pas')
    assert.equal(loose.stock, 3, 'une pièce non reliée garde l’ancien décrément')

    const [consumption] = await InventoryMovement.query()
      .where('inventoryItemId', filter.id)
      .where('reason', 'consumption')
    assert.equal(consumption.quantity, -2)
    assert.equal(consumption.maintenanceEventId, event.id)

    // Supprimer l'entretien remet la sortie en stock.
    await maintenance.deleteForBoat(user, boat, event.id)
    await filter.refresh()
    assert.equal(filter.quantity, 5)
    const back = await InventoryMovement.query()
      .where('inventoryItemId', filter.id)
      .where('reason', 'return')
    assert.lengthOf(back, 1)
    assert.equal(back[0].quantity, 2)
  })

  test('les alertes du widget et du moteur suivent l’article relié', async ({ assert }) => {
    const { user, boat, engine } = await fleet()
    const filter = await item(user, { quantity: 1 })
    // Stock local sous son seuil, mais la pièce est reliée : c'est l'article qui compte.
    await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      designation: 'Filtre à gasoil',
      stock: 0,
      minStockAlert: 1,
      inventoryItemId: filter.id,
    } as Partial<BoatEnginePart>).create()

    const parts = await app.container.make(BoatEnginePartService)
    const alerts = await parts.listAlertsForBoats([boat.id])
    assert.equal(alerts.lowStockCount, 0)

    const low = await parts.listLowStock(engine.id)
    assert.lengthOf(low, 1, 'article à 1 sous son seuil de 2')

    const inventory = await app.container.make(InventoryService)
    assert.equal(await inventory.lowCount(user.organizationId!), 1)
  })
})

test.group('InventoryService — reprise des stocks moteur', () => {
  test('un article par référence, quantités sommées, pièces reliées, sans perte', async ({
    assert,
  }) => {
    const { user, boat } = await fleet()
    const second = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const [engine] = boat.engines
    await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      designation: 'Filtre gasoil',
      reference: 'R-12',
      stock: 2,
      minStockAlert: 1,
    }).create()
    await BoatEnginePartFactory.merge({
      boatEngineId: second.id,
      designation: 'Filtre à gasoil',
      reference: 'r-12',
      stock: 3,
      minStockAlert: 2,
    }).create()
    await BoatEnginePartFactory.merge({
      boatEngineId: second.id,
      designation: 'Courroie',
      reference: null,
      stock: null,
      minStockAlert: null,
    }).create()

    const inventory = await app.container.make(InventoryService)
    assert.equal(await inventory.unlinkedPartsCount(user.organizationId!), 2)

    const result = await inventory.importFromEngineParts(user, 'reprise')
    assert.deepEqual(result, { itemsCreated: 1, partsLinked: 2 })

    const [created] = await InventoryItem.query().where('organizationId', user.organizationId!)
    assert.equal(created.quantity, 5)
    assert.equal(created.minQuantity, 2)
    const linked = await BoatEnginePart.query().where('inventoryItemId', created.id)
    assert.sameMembers(
      linked.map((p) => p.stock),
      [2, 3]
    )

    // Idempotente : rien de plus au second passage.
    assert.deepEqual(await inventory.importFromEngineParts(user, 'reprise'), {
      itemsCreated: 0,
      partsLinked: 0,
    })
  })
})

test.group('PurchaseOrderService', () => {
  test('la réception fait entrer le stock, recalcule le prix moyen et impute le budget', async ({
    assert,
  }) => {
    const { user, boat } = await fleet()
    const filter = await item(user, { quantity: 4 })
    const supplier = await Supplier.create({ organizationId: user.organizationId!, name: 'Uship' })
    const orders = await app.container.make(PurchaseOrderService)

    const order = await orders.create(user, {
      supplierId: supplier.id,
      boatId: boat.id,
      lines: [{ inventoryItemId: filter.id, quantity: 6, unitCost: 15 }],
    })
    assert.equal(order.number, 1)
    assert.equal(order.status, 'draft')

    await orders.send(user.organizationId!, order.id)
    const received = await orders.receive(user, order.id, () => 'Pièces')

    assert.equal(received.status, 'received')
    await filter.refresh()
    assert.equal(filter.quantity, 10)
    assert.equal(filter.averageCost, 13)

    const entry = await BoatBudgetEntry.findOrFail(received.budgetEntryId!)
    assert.equal(entry.boatId, boat.id)
    assert.equal(Number(entry.amount), 90)
    assert.equal(entry.category, 'maintenance')

    await assert.rejects(
      () => orders.receive(user, order.id, () => 'Pièces'),
      PurchaseOrderTransitionError
    )
  })

  test('sans bateau, la réception n’écrit aucune dépense ; numéros séquentiels', async ({
    assert,
  }) => {
    const { user } = await fleet()
    const filter = await item(user)
    const supplier = await Supplier.create({ organizationId: user.organizationId!, name: 'Uship' })
    const orders = await app.container.make(PurchaseOrderService)

    const first = await orders.create(user, {
      supplierId: supplier.id,
      lines: [{ inventoryItemId: filter.id, quantity: 1 }],
    })
    const second = await orders.create(user, {
      supplierId: supplier.id,
      lines: [{ inventoryItemId: filter.id, quantity: 1 }],
    })
    assert.deepEqual([first.number, second.number], [1, 2])
    // Sans prix saisi, la ligne reprend le prix moyen de l'article.
    assert.equal(first.lines[0].unitCost, 10)

    const received = await orders.receive(user, first.id, () => 'Pièces')
    assert.isNull(received.budgetEntryId)
  })

  test('commander les stocks bas d’un fournisseur', async ({ assert }) => {
    const { user } = await fleet()
    const supplier = await Supplier.create({ organizationId: user.organizationId!, name: 'Uship' })
    const inventory = await app.container.make(InventoryService)
    const low = await inventory.create(user, {
      name: 'Anode',
      minQuantity: 3,
      supplierId: supplier.id,
      initialQuantity: 1,
    })
    await inventory.create(user, {
      name: 'Bougie',
      minQuantity: 1,
      supplierId: supplier.id,
      initialQuantity: 8,
    })

    const orders = await app.container.make(PurchaseOrderService)
    const order = await orders.createFromLowStock(user, supplier.id)

    assert.lengthOf(order.lines, 1)
    assert.equal(order.lines[0].inventoryItemId, low.id)
    assert.equal(order.lines[0].quantity, 5)
  })

  test('les numéros ne se mélangent pas entre organisations', async ({ assert }) => {
    const a = await fleet()
    const b = await fleet()
    const orders = await app.container.make(PurchaseOrderService)
    for (const { user } of [a, b]) {
      const filter = await item(user)
      const supplier = await Supplier.create({ organizationId: user.organizationId!, name: 'S' })
      const order = await orders.create(user, {
        supplierId: supplier.id,
        lines: [{ inventoryItemId: filter.id, quantity: 1 }],
      })
      assert.equal(order.number, 1)
    }
    const total = await db.from('purchase_orders').count('* as n').first()
    assert.isAtLeast(Number(total?.n), 2)
  })
})
