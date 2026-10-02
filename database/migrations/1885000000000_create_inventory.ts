import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Inventaire de pièces au niveau de l'organisation (#892).
 *
 * - `suppliers` : fournisseurs (contact, délai de livraison).
 * - `inventory_items` : un article du stock central de l'atelier — quantité,
 *   seuil d'alerte, emplacement, prix d'achat moyen pondéré, fournisseur
 *   habituel. Quantités décimales (litres d'huile, mètres de durite).
 * - `inventory_movements` : le journal du stock, une ligne signée par entrée
 *   ou sortie (`purchase`, `consumption`, `adjustment`, `return`). La quantité
 *   de l'article est la somme de ses mouvements, tenue à jour à chaque écriture.
 * - `purchase_orders` / `purchase_order_lines` : bons de commande
 *   `draft` → `sent` → `received` (ou `cancelled`). La réception écrit les
 *   mouvements `purchase`, recalcule le prix moyen et, si la commande est
 *   affectée à un bateau, une dépense au budget de ce bateau.
 * - `boat_engine_parts.inventory_item_id` : une pièce moteur peut pointer vers
 *   un article. Son `stock` local n'est **ni effacé ni migré** : il reste lu
 *   tant que la pièce n'est pas reliée, et redevient la référence si on la
 *   délie — aucune perte de donnée.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('suppliers', (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.string('name', 150).notNullable()
      table.string('contact_name', 150).nullable()
      table.string('email', 255).nullable()
      table.string('phone', 50).nullable()
      table.integer('lead_time_days').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['organization_id'])
    })

    this.schema.createTable('inventory_items', (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.string('name', 200).notNullable()
      table.string('reference', 100).nullable()
      table.string('unit', 20).notNullable().defaultTo('unit')
      table.decimal('quantity', 12, 2).notNullable().defaultTo(0)
      table.decimal('min_quantity', 12, 2).nullable()
      table.string('location', 150).nullable()
      table.decimal('average_cost', 12, 2).nullable()
      table.integer('supplier_id').unsigned().nullable()
      table.foreign('supplier_id').references('suppliers.id').onDelete('SET NULL')
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['organization_id', 'name'])
      table.index(['supplier_id'])
    })
    this.schema.raw(
      "ALTER TABLE inventory_items ADD CONSTRAINT chk_inventory_items_unit CHECK (unit IN ('unit', 'liter', 'meter', 'kit', 'box'))"
    )

    this.schema.createTable('purchase_orders', (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.integer('number').notNullable()
      table.integer('supplier_id').unsigned().notNullable()
      table.foreign('supplier_id').references('suppliers.id').onDelete('RESTRICT')
      table.integer('boat_id').unsigned().nullable()
      table.foreign('boat_id').references('boats.id').onDelete('SET NULL')
      table.string('status', 20).notNullable().defaultTo('draft')
      table.date('ordered_on').nullable()
      table.timestamp('received_at', { useTz: true }).nullable()
      table.integer('budget_entry_id').unsigned().nullable()
      table.foreign('budget_entry_id').references('boat_budget_entries.id').onDelete('SET NULL')
      table.integer('created_by').unsigned().nullable()
      table.foreign('created_by').references('users.id').onDelete('SET NULL')
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['organization_id', 'number'])
      table.index(['organization_id', 'status'])
      table.index(['supplier_id'])
      table.index(['boat_id'])
      table.index(['budget_entry_id'])
      table.index(['created_by'])
    })
    this.schema.raw(
      "ALTER TABLE purchase_orders ADD CONSTRAINT chk_purchase_orders_status CHECK (status IN ('draft', 'sent', 'received', 'cancelled'))"
    )

    this.schema.createTable('purchase_order_lines', (table) => {
      table.increments('id')
      table.integer('purchase_order_id').unsigned().notNullable()
      table.foreign('purchase_order_id').references('purchase_orders.id').onDelete('CASCADE')
      table.integer('inventory_item_id').unsigned().notNullable()
      table.foreign('inventory_item_id').references('inventory_items.id').onDelete('RESTRICT')
      table.decimal('quantity', 12, 2).notNullable()
      table.decimal('unit_cost', 12, 2).notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['purchase_order_id'])
      table.index(['inventory_item_id'])
    })
    this.schema.raw(
      'ALTER TABLE purchase_order_lines ADD CONSTRAINT chk_purchase_order_lines_quantity CHECK (quantity > 0)'
    )

    this.schema.createTable('inventory_movements', (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.integer('inventory_item_id').unsigned().notNullable()
      table.foreign('inventory_item_id').references('inventory_items.id').onDelete('CASCADE')
      table.decimal('quantity', 12, 2).notNullable()
      table.string('reason', 20).notNullable()
      table.decimal('unit_cost', 12, 2).nullable()
      table.integer('maintenance_event_id').unsigned().nullable()
      table
        .foreign('maintenance_event_id')
        .references('boat_maintenance_events.id')
        .onDelete('SET NULL')
      table.integer('purchase_order_id').unsigned().nullable()
      table.foreign('purchase_order_id').references('purchase_orders.id').onDelete('SET NULL')
      table.integer('user_id').unsigned().nullable()
      table.foreign('user_id').references('users.id').onDelete('SET NULL')
      table.text('note').nullable()
      table.timestamp('occurred_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['inventory_item_id', 'occurred_at'])
      table.index(['organization_id'])
      table.index(['maintenance_event_id'])
      table.index(['purchase_order_id'])
      table.index(['user_id'])
    })
    this.schema.raw(
      "ALTER TABLE inventory_movements ADD CONSTRAINT chk_inventory_movements_reason CHECK (reason IN ('purchase', 'consumption', 'adjustment', 'return'))"
    )
    this.schema.raw(
      'ALTER TABLE inventory_movements ADD CONSTRAINT chk_inventory_movements_quantity CHECK (quantity <> 0)'
    )

    this.schema.alterTable('boat_engine_parts', (table) => {
      table.integer('inventory_item_id').unsigned().nullable()
      table.foreign('inventory_item_id').references('inventory_items.id').onDelete('SET NULL')
      table.index(['inventory_item_id'])
    })
  }

  async down() {
    this.schema.alterTable('boat_engine_parts', (table) => {
      table.dropForeign(['inventory_item_id'])
      table.dropIndex(['inventory_item_id'])
      table.dropColumn('inventory_item_id')
    })
    this.schema.dropTable('inventory_movements')
    this.schema.dropTable('purchase_order_lines')
    this.schema.dropTable('purchase_orders')
    this.schema.dropTable('inventory_items')
    this.schema.dropTable('suppliers')
  }
}
