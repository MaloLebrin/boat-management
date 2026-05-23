import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
        .notNullable()
        .unique()
      table.string('stripe_subscription_id').notNullable().unique()
      table.string('stripe_price_id').notNullable()
      table.enu('plan_tier', ['starter', 'pro', 'enterprise']).notNullable()
      table
        .enu('status', [
          'active',
          'trialing',
          'past_due',
          'canceled',
          'incomplete',
          'incomplete_expired',
          'unpaid',
          'paused',
        ])
        .notNullable()
      table.enu('billing_interval', ['month', 'year']).notNullable()
      table.timestamp('current_period_start').notNullable()
      table.timestamp('current_period_end').notNullable()
      table.boolean('cancel_at_period_end').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
