import { normalizeCountryCode } from '#shared/helpers/countries'
import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Normalisation des pays saisis en texte libre vers ISO 3166-1 alpha-2 (#580).
 *
 * `boats.flag_country` et `ports.country` acceptaient n'importe quelle chaîne :
 * `FR`, `FRA`, `France` et `france` désignaient le même pays sans jamais se
 * ressembler. Les deux champs passent en liste fermée côté formulaire **et**
 * côté validator ; ce backfill aligne l'existant.
 *
 * Best-effort assumé : `normalizeCountryCode()` rend `null` pour ce qu'elle ne
 * sait pas trancher (`Bretagne`, une faute de frappe), et **on laisse alors la
 * valeur intacte**. Rien n'est perdu, rien n'est deviné — l'affichage replie sur
 * la valeur brute via `countryName()`, et le champ étant nullable, aucune
 * édition d'un bateau ou d'un port existant n'est bloquée.
 *
 * Aucun DDL ici : les colonnes sont déjà nullable et assez larges. Les
 * rétrécir casserait justement le résidu qu'on choisit de conserver.
 */
export default class extends BaseSchema {
  private readonly targets = [
    { table: 'boats', column: 'flag_country' },
    { table: 'ports', column: 'country' },
  ] as const

  async up() {
    this.defer(async (db) => {
      for (const { table, column } of this.targets) {
        // Une poignée de valeurs distinctes, pas une ligne par bateau.
        const { rows } = await db.rawQuery(
          `select distinct "${column}" from "${table}" where "${column}" is not null and "${column}" <> ''`
        )

        for (const row of rows as Array<Record<string, string>>) {
          const raw = row[column]
          const normalized = normalizeCountryCode(raw)
          if (!normalized || normalized === raw) continue

          await db.rawQuery(`update "${table}" set "${column}" = ? where "${column}" = ?`, [
            normalized,
            raw,
          ])
        }
      }
    })
  }

  async down() {
    // Volontairement vide : la valeur libre d'origine (`France`, `FRA`) n'est
    // pas conservée, on ne peut donc pas la restaurer. Même parti pris que
    // `1779400001000_backfill_organization_memberships` — un backfill ne se
    // rejoue pas à l'envers, et laisser des codes ISO en base après rollback
    // reste correct puisque la colonne accepte du texte libre.
  }
}
