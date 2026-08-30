import { legacyMaterialNote, normalizeSailMaterial } from '#shared/helpers/sail_material'
import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Normalisation du matériau de voile vers l'enum `SAIL_MATERIALS` (#578).
 *
 * `boat_sails.material` acceptait n'importe quelle chaîne : `dacron`, `Dacron`
 * et `DACRON®` désignaient le même tissu sans jamais se ressembler. Le champ
 * passe en liste fermée côté formulaire **et** côté validator ; ce backfill
 * aligne l'existant via `normalizeSailMaterial()` (insensible casse/accents,
 * motifs du spécifique au générique — testé unitairement).
 *
 * Contrairement au backfill des pays (#580), **aucune valeur n'est laissée
 * intacte** : une saisie non mappable devient `other` et la valeur d'origine
 * est recopiée dans `notes` — aucune information perdue.
 *
 * Aucun DDL ici : la colonne est déjà nullable et assez large.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_sails'

  async up() {
    this.defer(async (db) => {
      // Une poignée de valeurs distinctes, pas une ligne par voile.
      const { rows } = await db.rawQuery(
        `select distinct "material" from "boat_sails" where "material" is not null and "material" <> ''`
      )

      for (const row of rows as Array<{ material: string }>) {
        const raw = row.material
        const normalized = normalizeSailMaterial(raw)
        if (normalized === raw) continue

        if (normalized) {
          await db.rawQuery(`update "boat_sails" set "material" = ? where "material" = ?`, [
            normalized,
            raw,
          ])
          continue
        }

        // `||` et `case` sont valides sur Postgres comme sur SQLite (base de test).
        const note = legacyMaterialNote(raw)
        await db.rawQuery(
          `update "boat_sails"
             set "material" = 'other',
                 "notes" = case when "notes" is null or "notes" = '' then ? else "notes" || ? end
           where "material" = ?`,
          [note, `\n\n${note}`, raw]
        )
      }
    })
  }

  async down() {
    // Volontairement vide : même parti pris que `1834000000000_normalize_country_codes`
    // — un backfill ne se rejoue pas à l'envers. La saisie d'origine survit dans
    // `notes` quand elle n'était pas mappable, et laisser des slugs en base
    // après rollback reste correct puisque la colonne accepte du texte libre.
  }
}
