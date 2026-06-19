import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_documents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
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
      table
        .enum('type', [
          'francisation',
          'insurance',
          'navigation_permit',
          'radio_license',
          'safety_inspection',
          'tonnage',
          'ce_certificate',
          'crew_role',
          'other',
        ])
        .notNullable()
      table.string('custom_type_label').nullable()
      table.string('reference_number').nullable()
      table.date('issued_at').nullable()
      table.date('expires_at').nullable()
      table.string('issuer').nullable()
      table
        .integer('media_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('media')
        .onDelete('SET NULL')
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
