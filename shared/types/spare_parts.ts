import type { DiagnosticSheetSlug } from '#shared/types/diagnostic'

/**
 * Ensembles fonctionnels des catalogues de pièces détachées hors-bord (#517).
 * La nomenclature (slug + intitulé catalogue EN) est commune aux catalogues
 * revendeurs (Partzilla, Boats.net, Crowley Marine).
 */
export const PART_ASSEMBLY_SLUGS = [
  'carburetor',
  'fuel-system',
  'ignition',
  'power-unit',
  'recoil-starter',
  'lower-unit',
  'propeller',
  'cowling',
  'bracket',
] as const

export type PartAssemblySlug = (typeof PART_ASSEMBLY_SLUGS)[number]

/** Marques couvertes par le corpus v1 (issue #517). */
export const SPARE_PARTS_BRAND_SLUGS = ['yamaha', 'johnson-evinrude', 'mercury-mariner'] as const

export type SparePartsBrandSlug = (typeof SPARE_PARTS_BRAND_SLUGS)[number]

export interface SparePartItem {
  /** Clé stable persistée en base (`<assembly>.<slug>`) — ne jamais renommer. */
  key: string
  labelKey: string
  /**
   * Intitulé officiel des catalogues constructeur (EN), affiché tel quel dans
   * les deux locales : c'est un identifiant de recherche, pas de l'UI copy —
   * exception assumée à la règle « tout texte passe par t() ».
   */
  catalogName: string
  detailKey?: string
  /** Pièce incluse dans un kit (kit de réfection, kit pompe à eau…). */
  kitKey?: string
  /** Fourchette de prix indicative (clé i18n, source : catalogues revendeurs). */
  priceKey?: string
  /** Code fonction Yamaha (5 chiffres centraux de la référence), si connu. */
  yamahaFunctionCode?: string
}

export interface SparePartAssembly {
  slug: PartAssemblySlug
  labelKey: string
  /** Intitulé catalogue EN (`CARBURETOR`, `LOWER CASING / WATER PUMP`…). */
  catalogLabel: string
  descriptionKey: string
  /** Code fonction Yamaha de l'ensemble, si connu (ex. `14301` = carburateur). */
  yamahaFunctionCode?: string
  /** Fiche de diagnostic (#515) correspondante, pour le lien croisé. */
  diagnosticSheet?: DiagnosticSheetSlug
  parts: readonly SparePartItem[]
}

/**
 * Pièces qui ne se commandent PAS par référence constructeur (durite,
 * visserie, bougie par équivalence…) — catégorie à part, sinon l'utilisateur
 * cherche un numéro qui n'existe pas.
 */
export interface UnreferencedPartItem {
  /** Clé stable persistée en base (`unreferenced.<slug>`) — ne jamais renommer. */
  key: string
  labelKey: string
  adviceKey: string
}

/** Où trouver la plaque signalétique selon la marque. */
export interface EnginePlateHint {
  brand: SparePartsBrandSlug
  /** Nom d'affichage de la marque (nom propre, identique dans les deux locales). */
  brandName: string
  locationKey: string
  exampleKey?: string
}

/** Lien sortant vers un catalogue revendeur (vue éclatée) — solution v1. */
export interface SparePartsRetailerLink {
  id: string
  /** Nom et URL littéraux : noms propres, identiques dans les deux locales. */
  name: string
  url: string
}

/** Entrée à plat du catalogue, indexée par clé — panier + export CSV. */
export interface SparePartCatalogEntry {
  key: string
  labelKey: string
  catalogName: string | null
  assemblySlug: PartAssemblySlug | null
  assemblyLabelKey: string | null
}

/** Ligne moteur envoyée par le backend à la page index « Pièces détachées ». */
export interface SparePartsEngineRow {
  id: number
  boatId: number
  boatName: string
  brand: string | null
  model: string | null
  kind: string
  status: string
  /** Nombre de lignes dans le panier de réparation. */
  cartCount: number
}

/** Ligne du panier de réparation envoyée au frontend. */
export interface RepairCartItemRow {
  id: number
  partKey: string
  quantity: number
  /** Référence constructeur relevée par l'utilisateur sur la vue éclatée. */
  reference: string | null
}
