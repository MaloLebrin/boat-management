import SailLoft from '#models/sail_loft'
import { normalizeCatalogText } from '#shared/helpers/boat_catalog'
import { catalogTokenNgrams } from '#shared/helpers/engine_catalog'
import { escapeLike } from '#shared/helpers/query'
import type { ListSailLoftsOptions, SailLoftOption } from '#shared/types/sail_loft'
import { inject } from '@adonisjs/core'

const DEFAULT_LOFT_LIMIT = 300

/**
 * Référentiel des voileries (#578), décalque simplifié de
 * `EquipmentCatalogService` (#577) : pas de catégories, pas de table de
 * modèles — une voile est un produit sur mesure.
 *
 * Le référentiel assiste la saisie, il ne la contraint jamais : une voilerie
 * hors corpus reste acceptée telle quelle par le formulaire, c'est l'invariant
 * de la série (#571, #573, #577).
 */
@inject()
export default class SailLoftService {
  /** Voileries actives du référentiel, ordre alphabétique. `q` restreint sur le nom ou le slug. */
  async listLofts(options: ListSailLoftsOptions = {}): Promise<SailLoftOption[]> {
    const query = SailLoft.query()
      .select(['id', 'slug', 'name', 'country', 'aliases'])
      .where('isActive', true)
      .orderBy('name', 'asc')
      .limit(options.limit ?? DEFAULT_LOFT_LIMIT)

    if (options.q) {
      const needle = `%${escapeLike(options.q)}%`
      query.where((sub) => {
        sub.whereILike('name', needle).orWhereILike('slug', needle)
      })
    }

    const lofts = await query
    return lofts.map((loft) => this.toLoftOption(loft))
  }

  /**
   * Bloc de props du formulaire voile : la liste des voileries et le
   * rattachement courant. Pas de rechargement partiel — il n'y a pas de modèles
   * à charger derrière une voilerie.
   *
   * À l'édition d'une voile sans `sailLoftId`, on rapproche le `sailmaker` déjà
   * saisi pour présélectionner la voilerie dès l'ouverture du formulaire.
   */
  async formProps(sail?: { sailLoftId: number | null; sailmaker: string | null } | null) {
    const sailLofts = await this.listLofts()

    if (sail?.sailLoftId) {
      return { sailLofts, sailCatalogLoftId: sail.sailLoftId }
    }

    const loft = await this.resolveLoft(sail?.sailmaker)
    return { sailLofts, sailCatalogLoftId: loft?.id ?? null }
  }

  /**
   * Rapproche une saisie libre (`Incidence`, `elvstrom`, `GV North Sails 2021`)
   * d'une voilerie du référentiel via son slug, son nom puis ses alias. Renvoie
   * `null` quand elle n'en fait pas partie — la valeur reste alors stockée
   * telle quelle, c'est l'invariant de l'épic.
   */
  async resolveLoft(freeText: string | null | undefined): Promise<SailLoft | null> {
    if (!freeText) return null
    const needle = normalizeCatalogText(freeText)
    if (!needle) return null

    const lofts = await SailLoft.query().select(['id', 'slug', 'name', 'country', 'aliases'])

    // Première passe : égalité stricte, comme `EquipmentCatalogService`. Elle
    // seule sait rattacher un alias qui n'est pas un mot de la saisie
    // (`p&b` → Pinnell & Bax).
    const byKey = new Map<string, SailLoft>()
    for (const loft of lofts) {
      for (const candidate of [loft.slug, loft.name, ...(loft.aliases ?? [])]) {
        const key = normalizeCatalogText(candidate)
        // Première voilerie déclarée gagne : un alias ambigu ne doit pas
        // dépendre de l'ordre d'insertion en base.
        if (key && !byKey.has(key)) byKey.set(key, loft)
      }
    }

    const exact = byKey.get(needle)
    if (exact) return exact

    // Seconde passe : la voilerie noyée dans une saisie plus large. Les
    // n-grammes sont ordonnés du plus long au plus court, la correspondance la
    // plus spécifique gagne.
    for (const ngram of catalogTokenNgrams(freeText)) {
      const match = byKey.get(ngram)
      if (match) return match
    }

    return null
  }

  private toLoftOption(loft: SailLoft): SailLoftOption {
    return {
      id: loft.id,
      slug: loft.slug,
      name: loft.name,
      country: loft.country,
      aliases: loft.aliases ?? [],
    }
  }
}
