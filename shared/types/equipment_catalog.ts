import type { GenericEquipmentCategory } from '#shared/types/boat'

/**
 * Catalogue de marques et modèles d'équipements génériques (#577), décalque du
 * catalogue moteur (#573) appliqué à `boat_generic_equipment`.
 *
 * `boat_generic_equipment.brand` et `.model` **restent en base et restent
 * alimentés** : le catalogue assiste la saisie, il ne la contraint jamais. Une
 * marque absente du corpus doit rester saisissable telle quelle — c'est
 * l'invariant commun à toute la série (#571, #573, #577).
 *
 * Les catégories du catalogue sont celles de l'équipement lui-même
 * (`GENERIC_EQUIPMENT_CATEGORIES`) : contrairement au moteur, il n'y a pas de
 * vocabulaire distinct entre le champ saisi et le classement du corpus.
 */

/** Marque du catalogue telle qu'exposée au frontend (prop Inertia `equipmentBrands`). */
export interface EquipmentBrandOption {
  id: number
  slug: string
  name: string
  country: string | null
  categories: GenericEquipmentCategory[]
  /**
   * Orthographes et anciens noms, tels que `EquipmentBrand.aliases`. Exposés
   * pour que la recherche du formulaire réponde comme `resolveBrand` côté
   * serveur : `raymarine autohelm` doit remonter Raymarine, `waeco` Dometic.
   */
  aliases: string[]
}

/**
 * Modèle du catalogue tel qu'exposé au frontend (prop Inertia
 * `equipmentCatalogModels`).
 */
export interface EquipmentModelOption {
  id: number
  slug: string
  name: string
  category: GenericEquipmentCategory
  productionStartYear: number | null
  productionEndYear: number | null
}

/**
 * Modèle d'un fichier de données (`database/data/equipment_catalog/`). Une
 * chaîne simple suffit quand seul le nom est connu : le slug est alors dérivé
 * du nom.
 */
export interface EquipmentModelSeed {
  name: string
  /** Slug explicite — à ne fournir que si celui dérivé du nom ne convient pas. */
  slug?: string
  /** Catégorie du modèle — à défaut, celle sous laquelle il est groupé. */
  category?: GenericEquipmentCategory
  productionStartYear?: number
  productionEndYear?: number
  aliases?: string[]
}

export type EquipmentModelSeedEntry = string | EquipmentModelSeed

/** Marque d'un fichier de données, avec ses modèles groupés par catégorie. */
export interface EquipmentBrandSeed {
  slug: string
  name: string
  country?: string
  categories: readonly GenericEquipmentCategory[]
  /** Orthographes réellement rencontrées et anciens noms (`waeco`, `autohelm`). */
  aliases?: readonly string[]
  isActive?: boolean
  /** La clé porte la catégorie des modèles qu'elle groupe. */
  models?: Partial<Record<GenericEquipmentCategory, readonly EquipmentModelSeedEntry[]>>
}

export interface ListEquipmentBrandsOptions {
  /** Priorise les marques de cette catégorie — ne s'y limite jamais. */
  category?: GenericEquipmentCategory | null
  q?: string | null
  limit?: number
}

export interface ListEquipmentModelsOptions {
  brandId: number
  q?: string | null
  limit?: number
}
