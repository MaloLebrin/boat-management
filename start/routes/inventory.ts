import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const InventoryController = () => import('#controllers/inventory_controller')
const SuppliersController = () => import('#controllers/suppliers_controller')
const PurchaseOrdersController = () => import('#controllers/purchase_orders_controller')

// Inventaire de pièces au niveau de l'organisation (#892) — plans Pro et
// Entreprise : toute la famille passe par la garde de plan, lecture comprise
// (un Starter n'a pas de stock central à consulter).
router
  .group(() => {
    router.get('inventory', [InventoryController, 'index']).as('inventory.index')
    router
      .post('inventory/import-engine-parts', [InventoryController, 'importEngineParts'])
      .as('inventory.importEngineParts')

    router.get('inventory/orders', [PurchaseOrdersController, 'index']).as('purchaseOrders.index')
    router.post('inventory/orders', [PurchaseOrdersController, 'store']).as('purchaseOrders.store')
    router
      .post('inventory/orders/reorder', [PurchaseOrdersController, 'reorder'])
      .as('purchaseOrders.reorder')
    router
      .put('inventory/orders/:id', [PurchaseOrdersController, 'update'])
      .as('purchaseOrders.update')
    router
      .post('inventory/orders/:id/send', [PurchaseOrdersController, 'send'])
      .as('purchaseOrders.send')
    router
      .post('inventory/orders/:id/receive', [PurchaseOrdersController, 'receive'])
      .as('purchaseOrders.receive')
    router
      .post('inventory/orders/:id/cancel', [PurchaseOrdersController, 'cancel'])
      .as('purchaseOrders.cancel')
    router
      .delete('inventory/orders/:id', [PurchaseOrdersController, 'destroy'])
      .as('purchaseOrders.destroy')

    router.post('inventory/suppliers', [SuppliersController, 'store']).as('suppliers.store')
    router.put('inventory/suppliers/:id', [SuppliersController, 'update']).as('suppliers.update')
    router
      .delete('inventory/suppliers/:id', [SuppliersController, 'destroy'])
      .as('suppliers.destroy')

    router.post('inventory', [InventoryController, 'store']).as('inventory.store')
    router.get('inventory/:id', [InventoryController, 'show']).as('inventory.show')
    router.put('inventory/:id', [InventoryController, 'update']).as('inventory.update')
    router.delete('inventory/:id', [InventoryController, 'destroy']).as('inventory.destroy')
    router.post('inventory/:id/adjust', [InventoryController, 'adjust']).as('inventory.adjust')
  })
  .use([middleware.auth(), middleware.requireModulePlan({ feature: 'inventory' })])
