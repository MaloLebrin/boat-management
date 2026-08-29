import { slugifyCatalogName } from '#shared/helpers/boat_catalog'
import type { BoatBrandSeed, BoatCategory, BoatModelSeed } from '#shared/types/boat_catalog'
import { CLASSIC_BRANDS } from './classic.js'
import { DINGHY_BRANDS } from './dinghy.js'
import { FISHING_BRANDS } from './fishing.js'
import { HOUSEBOAT_BRANDS } from './houseboat.js'
import { JETSKI_BRANDS } from './jetski.js'
import { MOTOR_YACHT_BRANDS } from './motor_yacht.js'
import { OPEN_DAYBOAT_BRANDS } from './open_dayboat.js'
import { POWER_CATAMARAN_BRANDS } from './power_catamaran.js'
import { RIB_BRANDS } from './rib.js'
import { SAILBOAT_MONOHULL_BRANDS } from './sailboat_monohull.js'
import { SAILBOAT_MULTIHULL_BRANDS } from './sailboat_multihull.js'
import { TENDER_BRANDS } from './tender.js'
import { TRAWLER_BRANDS } from './trawler.js'
import { WORKBOAT_BRANDS } from './workboat.js'

/**
 * Corpus v1 du catalogue de bateaux (#571), agrégé depuis un fichier par
 * catégorie. Voir `README.md` pour les règles de saisie.
 *
 * Une marque n'est déclarée qu'une fois, dans le fichier de sa catégorie
 * principale, avec toutes ses `categories` et ses modèles groupés par
 * catégorie.
 */
const BRAND_FILES: ReadonlyArray<readonly BoatBrandSeed[]> = [
  SAILBOAT_MONOHULL_BRANDS,
  SAILBOAT_MULTIHULL_BRANDS,
  MOTOR_YACHT_BRANDS,
  TRAWLER_BRANDS,
  POWER_CATAMARAN_BRANDS,
  RIB_BRANDS,
  JETSKI_BRANDS,
  HOUSEBOAT_BRANDS,
  DINGHY_BRANDS,
  OPEN_DAYBOAT_BRANDS,
  FISHING_BRANDS,
  TENDER_BRANDS,
  CLASSIC_BRANDS,
  WORKBOAT_BRANDS,
]

/**
 * Marques du corpus, dédoublonnage vérifié : un slug en double signalerait une
 * marque déclarée dans deux fichiers, ce que le seeder résoudrait
 * silencieusement en écrasant la première — d'où l'échec explicite.
 */
export const BOAT_CATALOG_BRANDS: readonly BoatBrandSeed[] = (() => {
  const bySlug = new Map<string, BoatBrandSeed>()
  for (const file of BRAND_FILES) {
    for (const brand of file) {
      const existing = bySlug.get(brand.slug)
      if (existing) {
        throw new Error(
          `Catalogue bateaux : le slug de marque « ${brand.slug} » est déclaré deux fois ` +
            `(« ${existing.name} » et « ${brand.name} »). Une marque ne se déclare que dans le ` +
            `fichier de sa catégorie principale.`
        )
      }
      bySlug.set(brand.slug, brand)
    }
  }
  return [...bySlug.values()]
})()

export interface NormalizedCatalogModel extends BoatModelSeed {
  slug: string
  category: BoatCategory
}

/**
 * Modèles d'une marque, à plat, avec leur slug résolu. Les entrées écrites
 * sous forme de chaîne voient leur slug dérivé du nom.
 */
export function normalizeBrandModels(brand: BoatBrandSeed): NormalizedCatalogModel[] {
  const models: NormalizedCatalogModel[] = []

  for (const [category, entries] of Object.entries(brand.models)) {
    for (const entry of entries ?? []) {
      const seed: BoatModelSeed = typeof entry === 'string' ? { name: entry } : entry
      models.push({
        ...seed,
        slug: seed.slug ?? slugifyCatalogName(seed.name),
        category: category as BoatCategory,
      })
    }
  }

  return models
}

/** Nombre total de modèles du corpus — utilisé par les tests et le seeder. */
export function countCatalogModels(): number {
  return BOAT_CATALOG_BRANDS.reduce((total, brand) => total + normalizeBrandModels(brand).length, 0)
}
