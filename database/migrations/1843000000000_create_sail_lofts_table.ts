import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Référentiel des voileries (#578), miroir simplifié de `equipment_brands`
 * (#577). Table globale, non rattachée à une organisation : c'est un
 * référentiel alimenté par `sail_loft_seeder`, jamais par les utilisateurs.
 *
 * Pas de table de modèles associée — une voile est un produit sur mesure, la
 * notion de modèle n'a pas de sens ici : le référentiel s'arrête à la voilerie.
 */
export default class extends BaseSchema {
  protected tableName = 'sail_lofts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // Identifiant stable à vie — jamais renommé, même si `name` évolue.
      table.string('slug', 120).notNullable().unique()
      table.string('name', 160).notNullable()
      table.string('country', 8).nullable()
      // Orthographes et anciens noms réellement rencontrés en saisie libre
      // (`elvstrom`, `incidences`, `p&b`), utilisés par
      // `SailLoftService.resolveLoft()`.
      table.jsonb('aliases').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index('name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
