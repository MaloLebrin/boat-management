import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_inspection_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('boat_inspection_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_inspections')
        .onDelete('CASCADE')

      // Clé stable d'un point de contrôle (`<section>.<slug>`), définie dans
      // shared/constants/inspections/inspection_checklist_content.ts et validée
      // contre ce corpus côté service — même mécanique que
      // `boat_engine_diagnostic_checks.step_key`.
      table.string('item_key', 64).notNullable()

      // Constat sur le point : `ok`, `remark` ou `damage`. L'absence de ligne
      // signifie « non contrôlé ». La note est obligatoire (côté validation)
      // dès que l'état n'est pas `ok`.
      table.string('state', 16).notNullable()
      table.text('note').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['boat_inspection_id', 'item_key'], {
        indexName: 'bii_inspection_item_unique',
      })
      table.index(['boat_inspection_id'], 'bii_inspection_index')
    })

    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_state_check"
      CHECK (state IN ('ok','remark','damage'))
    `)
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_state_check"`
    )
    this.schema.dropTable(this.tableName)
  }
}
