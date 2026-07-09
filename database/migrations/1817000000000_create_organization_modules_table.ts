import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_modules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')

      // Module add-on actif (`charter` | `crm_invoicing`, contraint plus bas).
      table.string('module').notNullable()
      // Origine du module : `subscription` (item Stripe payant) ou `granted`
      // (offert manuellement — grandfathering des comptes existants, geste
      // commercial). Détermine si la sync Stripe (#330) peut le retirer.
      table.string('source').notNullable().defaultTo('subscription')
      // ID de l'item d'abonnement Stripe qui porte ce module. Nullable :
      // renseigné uniquement pour `source = 'subscription'` par la sync
      // webhook multi-items (#330) ; toujours null pour un module `granted`.
      table.string('stripe_subscription_item_id').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['organization_id', 'module'])
      table.index('organization_id')
    })

    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_module_check"
      CHECK (module IN ('charter','crm_invoicing'))
    `)

    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_source_check"
      CHECK (source IN ('subscription','granted'))
    `)
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_module_check"`
    )
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_source_check"`
    )
    this.schema.dropTable(this.tableName)
  }
}
