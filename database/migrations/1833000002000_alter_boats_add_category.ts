import { deriveCategoryFromLegacy } from '#shared/helpers/boat_catalog'
import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Catégorie de bateau (#571) — vocabulaire fermé qui remplace le champ texte
 * libre `type` dans le formulaire.
 *
 * `type` **reste en base** : il n'est simplement plus alimenté par l'UI. Le
 * backfill ci-dessous est best-effort (normalisation de `type`, puis repli sur
 * `propulsion_type`) et laisse la colonne vide quand rien ne permet de
 * trancher — elle est nullable, on ne devine pas. Aucune donnée n'est perdue,
 * aucune migration destructive.
 *
 * Rien à voir avec `navigation_category` (catégorie CE A/B/C/D).
 */
export default class extends BaseSchema {
  protected tableName = 'boats'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('category', 40).nullable()
      table.index('category')
    })

    this.defer(async (db) => {
      const { rows } = await db.rawQuery(
        `select distinct "type", "propulsion_type" from "${this.tableName}" where "category" is null`
      )

      for (const row of rows as Array<{ type: string | null; propulsion_type: string | null }>) {
        const category = deriveCategoryFromLegacy(row.type, row.propulsion_type)
        if (!category) continue

        // Comparaison explicite plutôt qu'un `IS NOT DISTINCT FROM` : la paire
        // peut porter des `null` des deux côtés.
        const conditions: string[] = ['"category" is null']
        const bindings: Array<string> = [category]

        if (row.type === null) conditions.push('"type" is null')
        else {
          conditions.push('"type" = ?')
          bindings.push(row.type)
        }

        if (row.propulsion_type === null) conditions.push('"propulsion_type" is null')
        else {
          conditions.push('"propulsion_type" = ?')
          bindings.push(row.propulsion_type)
        }

        await db.rawQuery(
          `update "${this.tableName}" set "category" = ? where ${conditions.join(' and ')}`,
          bindings
        )
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex('category')
      table.dropColumn('category')
    })
  }
}
