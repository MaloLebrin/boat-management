import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Rattachement d'un équipement générique au catalogue (#577).
 *
 * La colonne est **nullable** et la clé étrangère en `SET NULL` : `brand` et
 * `model` restent en base et restent alimentés, ce sont eux le repli texte
 * libre. Un équipement hors catalogue reste donc parfaitement valide, et
 * retirer un modèle du corpus ne fait perdre aucune saisie.
 *
 * Pas de backfill : le rapprochement rétroactif des `brand`/`model` déjà
 * saisis est hors périmètre, `EquipmentCatalogService.resolveBrand()`
 * permettra de les rapprocher plus tard.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_generic_equipment'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('equipment_model_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('equipment_models')
        .onDelete('SET NULL')
      table.index(['equipment_model_id'], 'boat_generic_equipment_equipment_model_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['equipment_model_id'], 'boat_generic_equipment_equipment_model_index')
      table.dropColumn('equipment_model_id')
    })
  }
}
