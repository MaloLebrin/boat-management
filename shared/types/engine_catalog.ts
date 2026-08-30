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
 * Familles de **motorisation** — vocabulaire fermé qui décrit une installation
 * réelle : le moteur *et sa transmission*. C'est elle qui détermine la
 * nomenclature de pièces (#574), là où `kind`, `fuel` et `stroke_type` ne
 * suffisent pas — un même Volvo Penta D2-40 n'a pas les mêmes pièces en
 * saildrive et en ligne d'arbre.
 *
 * Portée par `boat_engines.family` (nullable) : un moteur sans famille reste
 * parfaitement utilisable, il retombe sur la nomenclature générique.
 *
 * Ne pas confondre avec :
 * - `ENGINE_KINDS` (`inboard`, `outboard`, `electric`, `hybrid`, `other`), le
 *   champ `kind` saisi sur le moteur ;
 * - `ENGINE_CATALOG_FAMILIES` ci-dessous, qui classe les **modèles du
 *   catalogue** — un modèle ne connaît pas la transmission sous laquelle il
 *   sera installé.
 */
export const ENGINE_FAMILIES = [
  'outboard_2t',
  'outboard_4t',
  'inboard_diesel_shaft',
  'inboard_diesel_saildrive',
  'inboard_petrol',
  'sterndrive',
  'pod_drive',
  'jet',
  'electric_outboard',
  'electric_inboard',
  'hybrid',
  'generator',
  'other',
] as const

export type EngineFamily = (typeof ENGINE_FAMILIES)[number]

export function isEngineFamily(value: unknown): value is EngineFamily {
  return typeof value === 'string' && (ENGINE_FAMILIES as readonly string[]).includes(value)
}

/**
 * Familles du **catalogue** (#573) — vocabulaire volontairement grossier qui
 * regroupe les marques du corpus et **priorise** les suggestions du formulaire.
 * Il classe des *modèles* (`engine_models.family`, `engine_brands.families`) :
 * un motoriste couvre une gamme, pas une installation.
 *
 * Distinct de `ENGINE_FAMILIES` par nature, pas par finesse : la transmission
 * (ligne d'arbre, saildrive, embase Z) est une propriété de l'installation, que
 * le catalogue ne peut pas connaître. `engineFamilyFromCatalogModel()`
 * (`#shared/helpers/engine_family`) fait le pont, en best-effort.
 */
export const ENGINE_CATALOG_FAMILIES = [
  'outboard_thermal',
  'outboard_electric',
  'inboard_diesel',
  'inboard_petrol',
  'jet',
  'generator',
] as const

export type EngineCatalogFamily = (typeof ENGINE_CATALOG_FAMILIES)[number]

export function isEngineCatalogFamily(value: unknown): value is EngineCatalogFamily {
  return typeof value === 'string' && (ENGINE_CATALOG_FAMILIES as readonly string[]).includes(value)
}

/**
 * Motif de référence constructeur d'une marque (#575).
 *
 * Généralise le cas Yamaha, seul décodage que #517 savait faire et qui était
 * codé en dur : les 5 chiffres centraux d'une référence identifient la
 * **fonction** de la pièce indépendamment du moteur, le premier bloc est le
 * code plaque, le dernier la variante. Une marque qui ne déclare pas de motif
 * n'affiche simplement pas de carte de décodage.
 */
export interface EngineReferencePattern {
  /** Gabarit interpolé : `{modelCode}` et `{functionCode}`. */
  template: string
  /** Code plaque de repli quand celui du moteur est absent ou non conforme. */
  fallbackModelCode: string
  /** Motif (source de `RegExp`) qu'un code plaque doit respecter pour servir. */
  modelCodePattern: string
  /** Clé i18n du texte explicatif de la carte « décoder une référence ». */
  explanationKey: string
}

/** Cycle moteur, aligné sur `engineStrokeTypes` du validator d'équipement. */
export type EngineStrokeType = '2_stroke' | '4_stroke'

/** Marque du catalogue telle qu'exposée au frontend (prop Inertia `engineBrands`). */
export interface EngineBrandOption {
  id: number
  slug: string
  name: string
  country: string | null
  families: EngineCatalogFamily[]
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
  family: EngineCatalogFamily
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
  family?: EngineCatalogFamily
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
  families: readonly EngineCatalogFamily[]
  /** Orthographes réellement rencontrées et anciens noms (`volvo`, `VP`). */
  aliases?: readonly string[]
  isActive?: boolean
  /**
   * Où trouver la plaque signalétique chez cette marque (#575) — clés i18n.
   * Remplace le tableau statique `ENGINE_PLATE_HINTS`, qui ne couvrait que
   * trois marques et les affichait toutes les trois dès que la marque du
   * moteur n'était pas reconnue.
   */
  plateLocationKey?: string
  plateExampleKey?: string
  /** Motif de référence constructeur, quand la marque en a un connu (#575). */
  referencePattern?: EngineReferencePattern
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
  models: Partial<Record<EngineCatalogFamily, readonly EngineModelSeedEntry[]>>
}

/**
 * Référence constructeur d'un fichier de données
 * (`database/data/engine_catalog/part_references.ts`) — #575.
 *
 * `sourceLabel` est **obligatoire** ici comme en base : une entrée sans source
 * ne se seed pas, donc ne peut pas s'afficher. C'est le critère « aucune
 * référence affichée sans indication de sa source » tenu par le type autant que
 * par le schéma.
 */
export interface EnginePartReferenceSeed {
  /** Slug de la marque du catalogue (`yamaha`, `volvo-penta`). */
  brandSlug: string
  /** Slug du modèle au sein de la marque (`4as`, `d1-20`). */
  modelSlug: string
  /** Clé du catalogue de pièces (`lower-unit.impeller`). */
  partKey: string
  reference: string
  /** D'où vient la référence — jamais vide. */
  sourceLabel: string
  sourceUrl?: string
  /** `YYYY-MM-DD` ; absent tant que l'entrée n'a pas été revérifiée. */
  verifiedAt?: string
}

export interface ListEngineBrandsOptions {
  /** Priorise les marques de cette famille — ne s'y limite jamais. */
  family?: EngineCatalogFamily | null
  q?: string | null
  limit?: number
}

export interface ListEngineModelsOptions {
  brandId: number
  q?: string | null
  limit?: number
}
