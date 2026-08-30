import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Rattachement d'un moteur au catalogue (#573).
 *
 * La colonne est **nullable** et la clé étrangère en `SET NULL` : `brand` et
 * `model` restent en base et restent alimentés, ce sont eux le repli texte
 * libre. Un moteur hors catalogue reste donc parfaitement valide, et retirer un
 * modèle du corpus ne fait perdre aucune saisie.
 *
 * Pas de backfill : le rattachement rétroactif des `brand`/`model` déjà saisis
 * est hors périmètre, `EngineCatalogService.resolveBrand()` permettra de les
 * rapprocher plus tard.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_engines'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('engine_model_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('engine_models')
        .onDelete('SET NULL')
      // Index nommé explicitement : le nom auto
      // (`boat_engines_engine_model_id_index`) reste sous la limite, mais on
      // s'aligne sur la convention des tables moteur longues (#517).
      table.index(['engine_model_id'], 'boat_engines_engine_model_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['engine_model_id'], 'boat_engines_engine_model_index')
      table.dropColumn('engine_model_id')
    })
  }
}
