import type { EngineFuel } from '#shared/constants/boats/boat_form_options'

/**
 * Catalogue de marques et modèles de motorisation (#573), miroir du catalogue
 * de bateaux (#571).
 *
 * `boat_engines.brand` et `boat_engines.model` **restent en base et restent
 * alimentés** : le catalogue assiste la saisie, il ne la contraint jamais. Une
 * marque rare ou un moteur d'occasion hors corpus doit rester saisissable —
 * c'est l'invariant de l'épic #572.
 */

/**
 * Familles de motorisation — vocabulaire fermé qui regroupe les marques du
 * corpus et **priorise** les suggestions du formulaire.
 *
 * Volontairement grossier : la nomenclature fine des familles et des pièces est
 * le sujet de la sous-issue 2/4. Ici on ne pose que ce dont
 * `EngineCatalogService.listBrands({ family })` a besoin.
 *
 * Ne pas confondre avec `ENGINE_KINDS` (`inboard`, `outboard`, `electric`,
 * `hybrid`, `other`), qui est le champ `kind` saisi sur le moteur lui-même.
 */
export const ENGINE_FAMILIES = [
  'outboard_thermal',
  'outboard_electric',
  'inboard_diesel',
  'inboard_petrol',
  'jet',
  'generator',
] as const

export type EngineFamily = (typeof ENGINE_FAMILIES)[number]

export function isEngineFamily(value: unknown): value is EngineFamily {
  return typeof value === 'string' && (ENGINE_FAMILIES as readonly string[]).includes(value)
}

/** Cycle moteur, aligné sur `engineStrokeTypes` du validator d'équipement. */
export type EngineStrokeType = '2_stroke' | '4_stroke'

/** Marque du catalogue telle qu'exposée au frontend (prop Inertia `engineBrands`). */
export interface EngineBrandOption {
  id: number
  slug: string
  name: string
  country: string | null
  families: EngineFamily[]
}

/**
 * Modèle du catalogue tel qu'exposé au frontend (prop Inertia
 * `engineCatalogModels`). Porte de quoi pré-remplir le formulaire sans second
 * aller-retour.
 */
export interface EngineModelOption {
  id: number
  slug: string
  name: string
  /** Code plaque signalétique (`6E0`, `J50PLEA`, `D2-40`) — jamais reconstitué. */
  modelCode: string | null
  family: EngineFamily
  powerHp: number | null
  strokeType: EngineStrokeType | null
  fuel: EngineFuel | null
  productionStartYear: number | null
  productionEndYear: number | null
}

/**
 * Modèle d'un fichier de données (`database/data/engine_catalog/`). Une chaîne
 * simple suffit quand seul le nom est connu : le slug est alors dérivé du nom.
 */
export interface EngineModelSeed {
  name: string
  /** Slug explicite — à ne fournir que si celui dérivé du nom ne convient pas. */
  slug?: string
  /** Le code tel qu'il figure sur la plaque, jamais une reconstitution. */
  modelCode?: string
  /** Famille du modèle — à défaut, celle sous laquelle il est groupé. */
  family?: EngineFamily
  powerHp?: number
  displacementCc?: number
  cylinders?: number
  strokeType?: EngineStrokeType
  fuel?: EngineFuel
  productionStartYear?: number
  productionEndYear?: number
  aliases?: string[]
}

export type EngineModelSeedEntry = string | EngineModelSeed

/** Marque d'un fichier de données, avec ses modèles groupés par famille. */
export interface EngineBrandSeed {
  slug: string
  name: string
  country?: string
  families: readonly EngineFamily[]
  /** Orthographes réellement rencontrées et anciens noms (`volvo`, `VP`). */
  aliases?: readonly string[]
  isActive?: boolean
  /**
   * Valeurs appliquées à tous les modèles de la marque qui ne les précisent
   * pas — un hors-bord thermique moderne est 4 temps à essence, l'écrire une
   * fois vaut mieux que neuf cents fois.
   */
  modelDefaults?: Pick<EngineModelSeed, 'strokeType' | 'fuel'>
  /**
   * Chez cette marque, le nom commercial **est** le code de la plaque
   * signalétique (`D2-40`, `3YM30`) : `modelCode` est alors recopié depuis le
   * nom. À laisser absent quand le code plaque est distinct du nom commercial,
   * ce qui est le cas des hors-bord japonais — leur préfixe à trois caractères
   * ne se déduit pas du nom, et on ne le reconstitue pas.
   */
  modelCodeFromName?: boolean
  /** La clé porte la famille des modèles qu'elle groupe. */
  models: Partial<Record<EngineFamily, readonly EngineModelSeedEntry[]>>
}

export interface ListEngineBrandsOptions {
  /** Priorise les marques de cette famille — ne s'y limite jamais. */
  family?: EngineFamily | null
  q?: string | null
  limit?: number
}

export interface ListEngineModelsOptions {
  brandId: number
  q?: string | null
  limit?: number
}
