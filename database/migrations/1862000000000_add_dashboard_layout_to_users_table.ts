import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Disposition personnalisée du tableau de bord, par utilisateur : ordre des
 * widgets par colonne et widgets masqués (`shared/types/dashboard_layout.ts`).
 * `null` = disposition par défaut. Stockée en jsonb pour évoluer sans
 * migration (le blob porte un `version`), à l'image des préférences `locale`
 * et `theme`.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('dashboard_layout').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('dashboard_layout')
    })
  }
}
