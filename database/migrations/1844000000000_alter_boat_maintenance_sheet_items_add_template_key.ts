import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Clé stable du gabarit dont provient un item de fiche de maintenance (#583).
 *
 * Colonne **nullable, sans backfill** : les items déjà instanciés n'ont que
 * leur libellé copié en base et rien ne permet de les rattacher au corpus a
 * posteriori sans deviner — ils restent à `null` et gardent leur texte tel
 * quel. Seules les fiches instanciées après cette migration portent la clé
 * (`<type>.<slug>`, définie dans
 * `shared/constants/maintenance/maintenance_sheet_content.ts`) — même
 * mécanique que `part_key` (pièces) et `item_key` (états des lieux).
 */
export default class extends BaseSchema {
  protected tableName = 'boat_maintenance_sheet_items'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('template_key', 64).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('template_key')
    })
  }
}
