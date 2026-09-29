import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Corbeille des bateaux (#858). `deleted_at` nul = flotte visible. L'index
 * partiel ne couvre que les lignes en corbeille : c'est la purge quotidienne
 * qui le parcourt, pas les listes.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boats', (table) => {
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.raw(`
      CREATE INDEX "boats_deleted_at_index"
      ON "boats" ("deleted_at")
      WHERE "deleted_at" IS NOT NULL
    `)
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS "boats_deleted_at_index"')
    this.schema.alterTable('boats', (table) => {
      table.dropColumn('deleted_at')
    })
  }
}
