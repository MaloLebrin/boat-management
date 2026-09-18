import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'processed_stripe_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // L'index unique **est** le mécanisme d'idempotence (#703) : deux
      // livraisons concurrentes du même `evt_…` ne peuvent pas être admises
      // toutes les deux, quel que soit l'entrelacement des transactions. Une
      // simple lecture préalable ne le garantirait pas.
      table.string('stripe_event_id').notNullable().unique()
      // Type de l'événement (`customer.subscription.updated`…), à titre de
      // diagnostic : savoir *quoi* a été rejoué sans rouvrir les logs Stripe.
      table.string('type').notNullable()
      table.timestamp('processed_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
