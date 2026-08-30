import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Famille de motorisation du moteur (#574) — moteur **et** transmission.
 *
 * Colonne **nullable** : `kind`, `fuel` et `stroke_type` restent saisis et
 * restent la source de vérité de ce qu'ils décrivent. La famille est ce qu'eux
 * trois ne savent pas dire — un même D2-40 n'a pas les mêmes pièces en
 * saildrive et en ligne d'arbre — et un moteur qui ne la précise pas reste
 * parfaitement utilisable : la nomenclature de pièces retombe sur les ensembles
 * génériques.
 *
 * Le backfill est **best-effort** et reproduit exactement
 * `engineFamilyFromSignals()` (`#shared/helpers/engine_family`) :
 *
 * - un hors-bord sans cycle renseigné est classé `outboard_4t` (cas dominant,
 *   et les deux familles hors-bord partagent presque toute la nomenclature) —
 *   sans ce défaut, tous les hors-bord existants perdraient l'écran pièces
 *   qu'ils ont depuis #517 ;
 * - un in-bord diesel est classé `inboard_diesel_shaft`, la variante saildrive
 *   n'étant pas devinable ;
 * - un `kind` `electric` (in-bord ou hors-bord ?) et un in-bord sans carburant
 *   restent sans famille plutôt que d'être rangés au hasard.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_engines'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('family', 40).nullable()
      table.index(['family'], 'boat_engines_family_index')
    })

    // `defer` : l'`alterTable` ci-dessus doit être exécuté avant que les UPDATE
    // ne touchent la colonne.
    this.defer(async (db) => {
      const backfill: ReadonlyArray<{ family: string; where: string; bindings: string[] }> = [
        {
          family: 'electric_outboard',
          where: 'kind = ? and fuel = ?',
          bindings: ['outboard', 'electric'],
        },
        {
          family: 'outboard_2t',
          where: 'kind = ? and stroke_type = ?',
          bindings: ['outboard', '2_stroke'],
        },
        { family: 'outboard_4t', where: 'kind = ?', bindings: ['outboard'] },
        {
          family: 'inboard_diesel_shaft',
          where: 'kind = ? and fuel = ?',
          bindings: ['inboard', 'diesel'],
        },
        {
          family: 'inboard_petrol',
          where: 'kind = ? and fuel = ?',
          bindings: ['inboard', 'essence'],
        },
        {
          family: 'electric_inboard',
          where: 'kind = ? and fuel = ?',
          bindings: ['inboard', 'electric'],
        },
        { family: 'hybrid', where: 'kind = ?', bindings: ['hybrid'] },
      ]

      for (const rule of backfill) {
        // `family is null` : les règles sont ordonnées de la plus spécifique à
        // la plus large, la première qui matche gagne.
        await db.rawQuery(
          `update boat_engines set family = ? where family is null and ${rule.where}`,
          [rule.family, ...rule.bindings]
        )
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['family'], 'boat_engines_family_index')
      table.dropColumn('family')
    })
  }
}
