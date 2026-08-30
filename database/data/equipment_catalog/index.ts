import { slugifyCatalogName } from '#shared/helpers/boat_catalog'
import type { GenericEquipmentCategory } from '#shared/types/boat'
import type { EquipmentBrandSeed, EquipmentModelSeed } from '#shared/types/equipment_catalog'
import { ANCHORING_BRANDS } from './anchoring.js'
import { COMFORT_BRANDS } from './comfort.js'
import { DECK_BRANDS } from './deck.js'
import { ELECTRICAL_BRANDS } from './electrical.js'
import { ENERGY_BRANDS } from './energy.js'
import { NAVIGATION_BRANDS } from './navigation.js'
import { PLUMBING_BRANDS } from './plumbing.js'

/**
 * Corpus v1 du catalogue d'équipements (#577), agrégé depuis un fichier par
 * catégorie. Voir `README.md` pour les règles de saisie.
 *
 * Une marque n'est déclarée qu'une fois, dans le fichier de sa catégorie
 * principale, avec toutes ses `categories` et ses modèles groupés par
 * catégorie.
 */
const BRAND_FILES: ReadonlyArray<readonly EquipmentBrandSeed[]> = [
  NAVIGATION_BRANDS,
  ELECTRICAL_BRANDS,
  ANCHORING_BRANDS,
  DECK_BRANDS,
  ENERGY_BRANDS,
  COMFORT_BRANDS,
  PLUMBING_BRANDS,
]

/**
 * Marques du corpus, dédoublonnage vérifié : un slug en double signalerait une
 * marque déclarée dans deux fichiers, ce que le seeder résoudrait
 * silencieusement en écrasant la première — d'où l'échec explicite.
 */
export const EQUIPMENT_CATALOG_BRANDS: readonly EquipmentBrandSeed[] = (() => {
  const bySlug = new Map<string, EquipmentBrandSeed>()
  for (const file of BRAND_FILES) {
    for (const brand of file) {
      const existing = bySlug.get(brand.slug)
      if (existing) {
        throw new Error(
          `Catalogue équipement : le slug de marque « ${brand.slug} » est déclaré deux fois ` +
            `(« ${existing.name} » et « ${brand.name} »). Une marque ne se déclare que dans le ` +
            `fichier de sa catégorie principale.`
        )
      }
      bySlug.set(brand.slug, brand)
    }
  }
  return [...bySlug.values()]
})()

export interface NormalizedEquipmentModel extends EquipmentModelSeed {
  slug: string
  category: GenericEquipmentCategory
}

/**
 * Modèles d'une marque, à plat, avec leur slug résolu. Les entrées écrites
 * sous forme de chaîne voient leur slug dérivé du nom.
 */
export function normalizeEquipmentBrandModels(
  brand: EquipmentBrandSeed
): NormalizedEquipmentModel[] {
  const models: NormalizedEquipmentModel[] = []

  for (const [category, entries] of Object.entries(brand.models ?? {})) {
    for (const entry of entries ?? []) {
      const seed: EquipmentModelSeed = typeof entry === 'string' ? { name: entry } : entry
      models.push({
        ...seed,
        slug: seed.slug ?? slugifyCatalogName(seed.name),
        category: seed.category ?? (category as GenericEquipmentCategory),
      })
    }
  }

  return models
}

/** Nombre total de modèles du corpus — utilisé par les tests et le seeder. */
export function countEquipmentCatalogModels(): number {
  return EQUIPMENT_CATALOG_BRANDS.reduce(
    (total, brand) => total + normalizeEquipmentBrandModels(brand).length,
    0
  )
}
