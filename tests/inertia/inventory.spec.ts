import { afterEach, describe, expect, test, vi } from 'vitest'
import { formSpies, forms, mountWithStubs, routerSpies } from './helpers/mount'
import type {
  InventoryItemRow,
  PurchaseOrderRow,
  PurchaseOrderStatus,
} from '../../shared/types/inventory'

/**
 * Inventaire de pièces (#892) : la liste signale le stock bas, chaque bon de
 * commande ne propose que les gestes que son statut permet, les formulaires
 * visent la bonne route.
 */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})
vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import InventoryItemsTable from '../../inertia/components/inventory/InventoryItemsTable.vue'
import InventoryItemFormModal from '../../inertia/components/inventory/InventoryItemFormModal.vue'
import PurchaseOrderLinesEditor from '../../inertia/components/inventory/PurchaseOrderLinesEditor.vue'
import PurchaseOrdersList from '../../inertia/components/inventory/PurchaseOrdersList.vue'
import InventoryIndex from '../../inertia/pages/inventory/index.vue'

function item(overrides: Partial<InventoryItemRow> = {}): InventoryItemRow {
  return {
    id: 1,
    name: 'Filtre à huile',
    reference: 'OF-1',
    unit: 'unit',
    quantity: 4,
    minQuantity: 2,
    location: 'Étagère B',
    averageCost: 12,
    stockValue: 48,
    supplierId: null,
    supplierName: null,
    notes: null,
    isLow: false,
    linkedPartsCount: 0,
    ...overrides,
  }
}

function order(status: PurchaseOrderStatus): PurchaseOrderRow {
  return {
    id: 7,
    number: 3,
    status,
    supplierId: 1,
    supplierName: 'Uship',
    boatId: null,
    boatName: null,
    orderedOn: null,
    receivedAt: null,
    notes: null,
    total: 24,
    lines: [
      { id: 1, inventoryItemId: 1, itemName: 'Filtre', unit: 'unit', quantity: 2, unitCost: 12 },
    ],
  }
}

afterEach(() => vi.clearAllMocks())

describe('InventoryItemsTable', () => {
  test('marque le stock bas et émet le comptage', async () => {
    const low = item({ id: 2, quantity: 1, isLow: true })
    const w = mountWithStubs(InventoryItemsTable, {
      props: { items: [item(), low], canManage: true },
    })
    expect(w.get('[data-testid="inventory-row-2"]').attributes('data-low')).toBe('true')
    expect(w.get('[data-testid="inventory-row-1"]').attributes('data-low')).toBe('false')

    await w.get('[data-testid="inventory-row-2"] button').trigger('click')
    expect(w.emitted('adjust')?.[0]).toEqual([low])
  })

  test('sans droit de gestion, aucune action', () => {
    const w = mountWithStubs(InventoryItemsTable, { props: { items: [item()], canManage: false } })
    expect(w.findAll('button')).toHaveLength(0)
  })
})

describe('PurchaseOrdersList — gestes par statut', () => {
  function buttons(status: PurchaseOrderStatus) {
    const w = mountWithStubs(PurchaseOrdersList, {
      props: { orders: [order(status)], canManage: true, canDelete: true },
    })
    const labels = w
      .get('[data-testid="purchase-order-7"]')
      .findAll('button')
      .map((b) => b.text().trim())
    w.unmount()
    return labels
  }

  test('brouillon : modifier, envoyer, réceptionner, annuler, supprimer', () => {
    expect(buttons('draft')).toEqual([
      'inventory.list.edit',
      'inventory.orders.actions.send',
      'inventory.orders.actions.receive',
      'inventory.orders.actions.cancel',
      'inventory.orders.actions.delete',
    ])
  })

  test('envoyé : réceptionner ou annuler ; reçu : rien ; annulé : supprimer', () => {
    expect(buttons('sent')).toEqual([
      'inventory.orders.actions.receive',
      'inventory.orders.actions.cancel',
    ])
    expect(buttons('received')).toEqual([])
    expect(buttons('cancelled')).toEqual(['inventory.orders.actions.delete'])
  })

  test('envoyer poste sur la route du bon', async () => {
    const w = mountWithStubs(PurchaseOrdersList, {
      props: { orders: [order('draft')], canManage: true, canDelete: false },
    })
    const send = w.findAll('button').find((b) => b.text() === 'inventory.orders.actions.send')!
    await send.trigger('click')
    expect(routerSpies.post).toHaveBeenCalledWith(
      '/inventory/orders/7/send',
      {},
      { preserveScroll: true }
    )
  })
})

describe('InventoryItemFormModal', () => {
  test('crée sur POST /inventory, modifie sur PUT /inventory/:id', async () => {
    const create = mountWithStubs(InventoryItemFormModal, {
      props: { open: true, item: null, suppliers: [] },
    })
    await create.get('form').trigger('submit')
    expect(formSpies.post).toHaveBeenCalledWith('/inventory', expect.any(Object))

    const edit = mountWithStubs(InventoryItemFormModal, {
      props: { open: false, item: item({ id: 9 }), suppliers: [] },
    })
    await edit.setProps({ open: true })
    expect(forms[0].name).toBe('Filtre à huile')
    await edit.get('form').trigger('submit')
    expect(formSpies.put).toHaveBeenCalledWith('/inventory/9', expect.any(Object))
  })
})

describe('PurchaseOrderLinesEditor', () => {
  test('choisir un article propose son prix moyen et met le total à jour', async () => {
    const lines = [{ inventoryItemId: '' as number | '', quantity: '3', unitCost: '' }]
    const w = mountWithStubs(PurchaseOrderLinesEditor, {
      props: {
        modelValue: lines,
        items: [{ id: 5, name: 'Anode', unit: 'unit', averageCost: 7.5, supplierId: null }],
        errors: {},
      },
    })
    await w.findComponent({ name: 'BaseSelect' }).vm.$emit('update:modelValue', 5)

    expect(lines[0].unitCost).toBe('7.5')
    expect(w.get('[data-testid="purchase-order-total"]').text()).toContain('inventory.orders.total')
  })
})

describe('Page inventaire', () => {
  test('propose la reprise des stocks moteur et la lance', async () => {
    const w = mountWithStubs(InventoryIndex, {
      props: {
        items: [],
        suppliers: [],
        filters: { q: '', filter: 'all' },
        lowCount: 0,
        unlinkedPartsCount: 4,
        canManage: true,
        canDelete: false,
      },
    })
    await w.get('[data-testid="inventory-import"]').trigger('click')
    expect(routerSpies.post).toHaveBeenCalledWith(
      '/inventory/import-engine-parts',
      {},
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('sans droit de gestion, ni bandeau ni bouton d’ajout', () => {
    const w = mountWithStubs(InventoryIndex, {
      props: {
        items: [item()],
        suppliers: [],
        filters: { q: '', filter: 'all' },
        lowCount: 0,
        unlinkedPartsCount: 4,
        canManage: false,
        canDelete: false,
      },
    })
    expect(w.find('[data-testid="inventory-import-banner"]').exists()).toBe(false)
    expect(w.find('[data-testid="inventory-add"]').exists()).toBe(false)
  })
})
