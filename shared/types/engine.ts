import type { EngineFamily } from '#shared/types/engine_catalog'

/**
 * Inventaire moteur transverse (#598) — la liste des moteurs de la flotte,
 * consultable sans passer par la fiche d'un bateau.
 *
 * Le vocabulaire de tri et de filtre est fermé : `EngineListService` renvoie des
 * `filters` normalisés que la page rejoue tels quels dans l'URL, comme la liste
 * des bateaux (#571). Une valeur hors énumération est ignorée, jamais transmise
 * à la requête.
 */
export const ENGINE_LIST_SORTS = ['recent', 'brand', 'hours'] as const
export const ENGINE_LIST_DIRECTIONS = ['asc', 'desc'] as const

export type EngineListSort = (typeof ENGINE_LIST_SORTS)[number]
export type EngineListDirection = (typeof ENGINE_LIST_DIRECTIONS)[number]

export type EngineListQuery = {
  /** Recherche libre : marque, modèle, numéro de série ou nom du bateau. */
  q?: string
  /** Restreint à un bateau de l'organisation — `0` signifie « tous ». */
  boatId?: number
  kind?: string
  status?: string
  family?: string
  sort?: EngineListSort
  direction?: EngineListDirection
  page?: number
  perPage?: number
}

/** Filtres normalisés renvoyés au front — toutes les clés sont présentes. */
export type EngineListFilters = Required<EngineListQuery>

export type EngineListItem = {
  id: number
  boatId: number
  boatName: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  kind: string
  fuel: string | null
  family: EngineFamily | null
  status: string
  powerHp: number | null
  hours: number | null
  updatedAt: string | null
}

export type EngineListMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export type EnginesPaginated = {
  data: EngineListItem[]
  meta: EngineListMeta
}

/** Ligne brute sérialisée par Lucid, avant projection vers `EngineListItem`. */
export type EngineSerializedRow = {
  id: number | string
  boatId: number | string
  brand: string | null
  model: string | null
  serialNumber: string | null
  kind: string
  fuel: string | null
  family: string | null
  status: string
  powerHp: number | string | null
  hours: number | string | null
  updatedAt: string | null
}

/** Option du filtre « bateau », calculée côté serveur. */
export type EngineListBoatOption = {
  id: number
  name: string
}

/**
 * Compteurs de l'inventaire, calculés sur **toute** la flotte et non sur la
 * page courante : un « 3 hors service » qui change au feuilletage ne serait pas
 * un indicateur.
 */
export type EngineListSummary = {
  total: number
  operational: number
  inMaintenance: number
  outOfService: number
}

export type EngineListResult = {
  engines: EnginesPaginated
  filters: EngineListFilters
  boatOptions: EngineListBoatOption[]
  summary: EngineListSummary
}
