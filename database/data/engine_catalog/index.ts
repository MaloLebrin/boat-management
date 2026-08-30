import { ALL_SPARE_PART_KEYS } from '#shared/constants/spare_parts/spare_parts_content'
import { slugifyCatalogName } from '#shared/helpers/boat_catalog'
import type {
  EngineBrandSeed,
  EngineCatalogFamily,
  EngineModelSeed,
  EnginePartReferenceSeed,
} from '#shared/types/engine_catalog'
import { GENERATOR_BRANDS } from './generator.js'
import { INBOARD_DIESEL_BRANDS } from './inboard_diesel.js'
import { INBOARD_PETROL_BRANDS } from './inboard_petrol.js'
import { JET_BRANDS } from './jet.js'
import { OUTBOARD_ELECTRIC_BRANDS } from './outboard_electric.js'
import { OUTBOARD_THERMAL_BRANDS } from './outboard_thermal.js'
import { ENGINE_PART_REFERENCES } from './part_references.js'

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
  family: EngineCatalogFamily
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
        family: seed.family ?? (family as EngineCatalogFamily),
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

/**
 * Références constructeur du corpus (#575), vérifiées au chargement.
 *
 * Trois erreurs se paient à l'insertion et sont donc levées ici, où le message
 * nomme l'entrée fautive : une source vide (la colonne est `NOT NULL`, mais un
 * `sourceLabel` réduit à des espaces passerait), une clé de pièce inconnue du
 * catalogue (`ALL_SPARE_PART_KEYS`, le même vocabulaire que le panier), et un
 * couple (modèle, pièce) déclaré deux fois — que la contrainte d'unicité
 * rejetterait, ou pire, que le seeder écraserait silencieusement.
 */
export const ENGINE_CATALOG_PART_REFERENCES: readonly EnginePartReferenceSeed[] = (() => {
  const seen = new Set<string>()

  for (const entry of ENGINE_PART_REFERENCES) {
    const label = `${entry.brandSlug}/${entry.modelSlug}/${entry.partKey}`

    if (entry.sourceLabel.trim() === '') {
      throw new Error(
        `Références constructeur : l'entrée « ${label} » n'a pas de source. ` +
          `Une référence sans source ne se saisit pas.`
      )
    }
    if (!ALL_SPARE_PART_KEYS.has(entry.partKey)) {
      throw new Error(
        `Références constructeur : la clé de pièce « ${entry.partKey} » (entrée ` +
          `« ${label} ») n'existe pas au catalogue de pièces.`
      )
    }
    if (seen.has(label)) {
      throw new Error(
        `Références constructeur : le couple « ${label} » est déclaré deux fois. ` +
          `Un modèle ne porte qu'une référence par pièce.`
      )
    }
    seen.add(label)
  }

  return ENGINE_PART_REFERENCES
})()
