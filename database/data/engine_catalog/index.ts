import { slugifyCatalogName } from '#shared/helpers/boat_catalog'
import type { EngineBrandSeed, EngineFamily, EngineModelSeed } from '#shared/types/engine_catalog'
import { GENERATOR_BRANDS } from './generator.js'
import { INBOARD_DIESEL_BRANDS } from './inboard_diesel.js'
import { INBOARD_PETROL_BRANDS } from './inboard_petrol.js'
import { JET_BRANDS } from './jet.js'
import { OUTBOARD_ELECTRIC_BRANDS } from './outboard_electric.js'
import { OUTBOARD_THERMAL_BRANDS } from './outboard_thermal.js'

/**
 * Corpus v1 du catalogue moteur (#573), agrégé depuis un fichier par famille.
 * Voir `README.md` pour les règles de saisie.
 *
 * Une marque n'est déclarée qu'une fois, dans le fichier de sa famille
 * principale, avec toutes ses `families` et ses modèles groupés par famille.
 */
const BRAND_FILES: ReadonlyArray<readonly EngineBrandSeed[]> = [
  OUTBOARD_THERMAL_BRANDS,
  OUTBOARD_ELECTRIC_BRANDS,
  INBOARD_DIESEL_BRANDS,
  INBOARD_PETROL_BRANDS,
  JET_BRANDS,
  GENERATOR_BRANDS,
]

/**
 * Marques du corpus, dédoublonnage vérifié : un slug en double signalerait une
 * marque déclarée dans deux fichiers, ce que le seeder résoudrait
 * silencieusement en écrasant la première — d'où l'échec explicite.
 */
export const ENGINE_CATALOG_BRANDS: readonly EngineBrandSeed[] = (() => {
  const bySlug = new Map<string, EngineBrandSeed>()
  for (const file of BRAND_FILES) {
    for (const brand of file) {
      const existing = bySlug.get(brand.slug)
      if (existing) {
        throw new Error(
          `Catalogue moteur : le slug de marque « ${brand.slug} » est déclaré deux fois ` +
            `(« ${existing.name} » et « ${brand.name} »). Une marque ne se déclare que dans le ` +
            `fichier de sa famille principale.`
        )
      }
      bySlug.set(brand.slug, brand)
    }
  }
  return [...bySlug.values()]
})()

export interface NormalizedEngineModel extends EngineModelSeed {
  slug: string
  family: EngineFamily
}

/**
 * Modèles d'une marque, à plat, avec leur slug résolu et les `modelDefaults` de
 * la marque appliqués. Les entrées écrites sous forme de chaîne voient leur
 * slug dérivé du nom ; un modèle qui précise son cycle ou son carburant
 * l'emporte toujours sur le défaut de marque.
 */
export function normalizeEngineBrandModels(brand: EngineBrandSeed): NormalizedEngineModel[] {
  const models: NormalizedEngineModel[] = []

  for (const [family, entries] of Object.entries(brand.models)) {
    for (const entry of entries ?? []) {
      const seed: EngineModelSeed = typeof entry === 'string' ? { name: entry } : entry
      models.push({
        ...brand.modelDefaults,
        ...seed,
        slug: seed.slug ?? slugifyCatalogName(seed.name),
        family: seed.family ?? (family as EngineFamily),
        modelCode: seed.modelCode ?? (brand.modelCodeFromName ? seed.name : undefined),
      })
    }
  }

  return models
}

/** Nombre total de modèles du corpus — utilisé par les tests et le seeder. */
export function countEngineCatalogModels(): number {
  return ENGINE_CATALOG_BRANDS.reduce(
    (total, brand) => total + normalizeEngineBrandModels(brand).length,
    0
  )
}
