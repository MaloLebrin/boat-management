import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Références constructeur rattachées à un couple (modèle moteur, pièce) — #575.
 *
 * `source_label` est **NOT NULL** par choix : c'est la traduction en contrainte
 * de schéma du critère d'acceptation de #517, « aucune référence n'est affichée
 * sans indication de sa source ». Une référence sans source ne peut pas entrer
 * en base, donc ne peut pas s'afficher.
 *
 * La table n'enlève rien au parcours existant : une pièce sans référence connue
 * retombe exactement sur l'écran actuel (liens revendeurs vers la vue éclatée).
 */
export default class extends BaseSchema {
  protected tableName = 'engine_part_references'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('engine_model_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('engine_models')
        .onDelete('CASCADE')
      // Validée contre `ALL_SPARE_PART_KEYS` comme le panier de réparation :
      // les deux tables partagent le même vocabulaire de clés de pièces.
      table.string('part_key', 64).notNullable()
      table.string('reference', 64).notNullable()
      // D'où vient la référence — jamais vide, voir le commentaire de tête.
      table.string('source_label', 120).notNullable()
      table.text('source_url').nullable()
      // Dernière vérification : une entrée jamais revérifiée reste signalée
      // comme telle à l'écran plutôt que d'être présentée comme certaine.
      table.date('verified_at').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['engine_model_id', 'part_key'])
      table.index('engine_model_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
