import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_equipment_actions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')

      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')

      table.string('action_type').notNullable()
      table.string('status').notNullable().defaultTo('pending')
      table.string('label').notNullable()
      table.text('notes').nullable()
      table.decimal('estimated_cost', 10, 2).nullable()
      table.decimal('actual_cost', 10, 2).nullable()

      table.string('equipment_type').nullable()
      table.integer('equipment_id').nullable()

      table
        .integer('inspection_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_inspections')
        .onDelete('SET NULL')

      table
        .integer('created_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.timestamp('resolved_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index('boat_id')
      table.index('status')
      table.index(['equipment_type', 'equipment_id'])
    })

    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_action_type_check"
      CHECK (action_type IN ('to_buy','to_replace','to_repair'))
    `)

    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_status_check"
      CHECK (status IN ('pending','ordered','done','cancelled'))
    `)

    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_equipment_type_check"
      CHECK (equipment_type IS NULL OR equipment_type IN ('generic','safety','engine','sail','rig'))
    `)
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_action_type_check"`
    )
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_status_check"`
    )
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_equipment_type_check"`
    )
    this.schema.dropTable(this.tableName)
  }
}
