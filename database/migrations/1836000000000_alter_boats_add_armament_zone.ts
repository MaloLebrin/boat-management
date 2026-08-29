import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Zone d'armement Division 240 (#582) — la distance d'un abri sur laquelle le
 * bateau navigue (`basic` / `coastal` / `semi_offshore` / `offshore`).
 *
 * Nullable, sans valeur par défaut : les bateaux existants restent sans zone,
 * donc sans contrôle de conformité. Volontairement distincte de
 * `navigation_category` (catégorie de conception CE A–D), qui n'a aucun effet
 * réglementaire sur l'armement.
 */
export default class extends BaseSchema {
  protected tableName = 'boats'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('armament_zone').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('armament_zone')
    })
  }
}
