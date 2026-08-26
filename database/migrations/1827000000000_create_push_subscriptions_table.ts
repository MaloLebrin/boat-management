import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'push_subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      // Les endpoints FCM/APNs dépassent facilement 255 caractères
      table.text('endpoint').notNullable()
      // Clé d'unicité : un index unique sur un TEXT arbitraire est fragile,
      // on indexe le hash SHA-256 de l'endpoint
      table.string('endpoint_hash', 64).notNullable().unique()
      table.string('p256dh', 255).notNullable()
      table.string('auth', 255).notNullable()
      table.string('user_agent', 512).nullable()
      // Envois en échec consécutifs — purge au 404/410 (endpoint révoqué)
      table.integer('failure_count').notNullable().defaultTo(0)
      table.timestamp('last_used_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id'], 'push_subscriptions_user_id_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
