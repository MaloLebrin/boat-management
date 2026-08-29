/**
 * Taxonomie de catégories de bateau et catalogue de marques / modèles (#571).
 *
 * `BOAT_CATEGORIES` remplace le champ texte libre `boats.type` dans le
 * formulaire : c'est le vocabulaire fermé sur lequel s'appuient le filtre de la
 * liste, la priorisation des marques dans la combobox et, à terme, tout ce qui
 * a besoin de raisonner sur une famille de bateau.
 *
 * `boats.type` reste en base — aucune donnée n'est perdue — il n'est simplement
 * plus alimenté par l'UI.
 *
 * Ne pas confondre avec `navigation_category` (A/B/C/D), qui est la catégorie
 * CE de navigation et n'a aucun rapport.
 */
export const BOAT_CATEGORIES = [
  'sailboat_monohull',
  'sailboat_multihull',
  'motor_yacht',
  'power_catamaran',
  'trawler',
  'open_dayboat',
  'fishing',
  'rib',
  'jetski',
  'houseboat',
  'dinghy',
  'tender',
  'classic',
  'workboat',
  'other',
] as const

export type BoatCategory = (typeof BOAT_CATEGORIES)[number]

export function isBoatCategory(value: unknown): value is BoatCategory {
  return typeof value === 'string' && (BOAT_CATEGORIES as readonly string[]).includes(value)
}

/** Marque du catalogue telle qu'exposée au frontend (prop Inertia `brands`). */
export interface BoatBrandOption {
  id: number
  slug: string
  name: string
  country: string | null
  categories: BoatCategory[]
}

/** Modèle du catalogue tel qu'exposé au frontend (prop Inertia `catalogModels`). */
export interface BoatModelOption {
  id: number
  slug: string
  name: string
  category: BoatCategory
  productionStartYear: number | null
  productionEndYear: number | null
}

/**
 * Modèle d'un fichier de données (`database/data/boat_catalog/`). Une chaîne
 * simple suffit dans le cas courant : le slug est alors dérivé du nom.
 */
export interface BoatModelSeed {
  name: string
  /** Slug explicite — à ne fournir que si celui dérivé du nom ne convient pas. */
  slug?: string
  lengthM?: number
  productionStartYear?: number
  productionEndYear?: number
  aliases?: string[]
}

export type BoatModelSeedEntry = string | BoatModelSeed

/** Marque d'un fichier de données, avec ses modèles groupés par catégorie. */
export interface BoatBrandSeed {
  slug: string
  name: string
  country?: string
  categories: readonly BoatCategory[]
  aliases?: readonly string[]
  foundedYear?: number
  discontinuedYear?: number
  isActive?: boolean
  /** La clé porte la catégorie des modèles qu'elle groupe. */
  models: Partial<Record<BoatCategory, readonly BoatModelSeedEntry[]>>
}

export interface ListBrandsOptions {
  /** Priorise les marques de cette catégorie — ne s'y limite jamais. */
  category?: BoatCategory | null
  q?: string | null
  limit?: number
}

export interface ListModelsOptions {
  brandId: number
  q?: string | null
  limit?: number
}
