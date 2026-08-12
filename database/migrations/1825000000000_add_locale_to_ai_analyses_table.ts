import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_analyses'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('locale', 5).notNullable().defaultTo('fr')
      table.index(['organization_id', 'kind', 'locale'])
    })

    // Toutes les analyses existantes ont été générées par un prompt entièrement
    // français (#460) : le `defaultTo('fr')` les qualifie correctement et les
    // laisse visibles pour les utilisateurs francophones.
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['organization_id', 'kind', 'locale'])
      table.dropColumn('locale')
    })
  }
}
