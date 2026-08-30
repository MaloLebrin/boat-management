/**
 * Référentiel des voileries (#578), décalque simplifié du catalogue
 * d'équipements (#577) appliqué à `boat_sails`.
 *
 * `boat_sails.sailmaker` **reste en base et reste alimenté** : le référentiel
 * assiste la saisie, il ne la contraint jamais. Une voilerie absente du corpus
 * doit rester saisissable telle quelle — c'est l'invariant commun à toute la
 * série (#571, #573, #577).
 *
 * Particularité : pas de table de modèles — une voile est un produit sur
 * mesure, la notion de modèle n'a pas de sens ici.
 */

/** Voilerie du référentiel telle qu'exposée au frontend (prop Inertia `sailLofts`). */
export interface SailLoftOption {
  id: number
  slug: string
  name: string
  country: string | null
  /**
   * Orthographes et anciens noms, tels que `SailLoft.aliases`. Exposés pour que
   * la recherche de la combobox réponde comme `resolveLoft` côté serveur :
   * `elvstrom` doit remonter Elvström Sails.
   */
  aliases: string[]
}

/** Voilerie d'un fichier de données (`database/data/sail_lofts/`). */
export interface SailLoftSeed {
  /** Slug kebab-case sans accent, **stable à vie**. */
  slug: string
  /** Nom commercial officiel, accents et casse compris — non traduit. */
  name: string
  country?: string
  /** Orthographes réellement rencontrées et anciens noms. */
  aliases?: readonly string[]
  isActive?: boolean
}

export interface ListSailLoftsOptions {
  q?: string | null
  limit?: number
}
