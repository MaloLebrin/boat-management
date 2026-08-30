import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Aides plaque signalétique et motif de référence portés par la marque (#575).
 *
 * `ENGINE_PLATE_HINTS` était un tableau statique de trois marques : une marque
 * non couverte affichait les trois aides, faute de mieux. En colonnes de
 * `engine_brands`, l'aide suit le catalogue de #573 et se complète marque par
 * marque sans toucher au code.
 *
 * `reference_pattern` généralise le cas Yamaha codé en dur
 * (`yamahaReferenceExample()`) : les 5 chiffres centraux d'une référence
 * identifient la fonction de la pièce indépendamment du moteur. La carte
 * « décoder une référence » ne s'affiche que pour les marques qui déclarent un
 * motif — comportement inchangé pour Yamaha, rien de nouveau pour les autres.
 */
export default class extends BaseSchema {
  protected tableName = 'engine_brands'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('plate_location_key', 160).nullable()
      table.string('plate_example_key', 160).nullable()
      table.jsonb('reference_pattern').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('plate_location_key')
      table.dropColumn('plate_example_key')
      table.dropColumn('reference_pattern')
    })
  }
}
