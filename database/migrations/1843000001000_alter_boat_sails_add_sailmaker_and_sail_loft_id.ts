import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Voilerie sur les voiles (#578) — contrairement aux moteurs et équipements,
 * `boat_sails` n'avait aucun champ marque : les deux colonnes sont neuves.
 *
 * `sailmaker` est le texte libre, **source de vérité** : une voilerie hors
 * référentiel reste parfaitement valide. `sail_loft_id` est nullable et en
 * `SET NULL` : le rattachement au référentiel est facultatif, et retirer une
 * voilerie du corpus ne fait perdre aucune saisie.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_sails'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('sailmaker', 160).nullable()
      table
        .integer('sail_loft_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('sail_lofts')
        .onDelete('SET NULL')
      table.index(['sail_loft_id'], 'boat_sails_sail_loft_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['sail_loft_id'], 'boat_sails_sail_loft_index')
      table.dropColumn('sail_loft_id')
      table.dropColumn('sailmaker')
    })
  }
}
