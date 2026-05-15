import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'media'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('entity_type').notNullable()
      table.integer('entity_id').notNullable()
      table.string('kind').notNullable()

      table.string('cloudinary_public_id').notNullable()
      table.string('secure_url').notNullable()
      table.string('original_filename').notNullable()
      table.string('format').notNullable()
      table.integer('bytes').notNullable()
      table.integer('width').nullable()
      table.integer('height').nullable()

      table.integer('position').notNullable().defaultTo(0)
      table.string('caption').nullable()

      table
        .integer('uploaded_by_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      table.index(['entity_type', 'entity_id'])

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
