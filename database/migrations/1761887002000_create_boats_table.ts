import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('organization_id').unsigned().notNullable().index()
      table.string('name').notNullable()
      table.string('registration_number').nullable()
      table.string('type').nullable()

      table.unique(['organization_id', 'registration_number'])

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
