import type { DateTime } from 'luxon'
import type { BoatCategory } from '#shared/types/boat_catalog'

export type InspectionKind = 'checkout' | 'checkin'

/**
 * État d'un point de contrôle de la checklist (#584). Trois valeurs seulement :
 * l'absence de ligne en base signifie « non contrôlé », elle n'est pas un état.
 */
export const INSPECTION_ITEM_STATES = ['ok', 'remark', 'damage'] as const

export type InspectionItemState = (typeof INSPECTION_ITEM_STATES)[number]

export interface InspectionChecklistItem {
  /** Clé stable persistée en base (`<section>.<slug>`) — ne jamais renommer. */
  key: string
  labelKey: string
  /**
   * Restreint l'item à certaines catégories de bateau (#571). Absent = l'item
   * vaut pour toutes les catégories (et pour un bateau sans catégorie connue).
   */
  categories?: readonly BoatCategory[]
}

export interface InspectionChecklistSection {
  /** Préfixe des clés des items de la section — stable, jamais renommé. */
  key: string
  titleKey: string
  /** Même sémantique que `InspectionChecklistItem.categories`, pour la section entière. */
  categories?: readonly BoatCategory[]
  items: readonly InspectionChecklistItem[]
}

export type CreateInspectionPayload = {
  kind: InspectionKind
  performedAt: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  fuelLevel?: number | null
  engineHours?: number | null
  notes?: string | null
}

export type UpdateInspectionPayload = {
  /** Rejeu hors-ligne (#622) : ISO de l'`updatedAt` connu du client. */
  expectedUpdatedAt?: string
  performedAt?: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  fuelLevel?: number | null
  engineHours?: number | null
  notes?: string | null
}

export type BoatInspectionRow = {
  id: number
  reservationId: number
  kind: InspectionKind
  performedAt: string
  fuelLevel: number | null
  engineHours: string | null
  notes: string | null
  createdAt: string
  /** Base de la détection de conflit sur un PUT rejoué hors-ligne (#622). */
  updatedAt: string
}

export type SetInspectionItemPayload = {
  itemKey: string
  state: InspectionItemState
  /** Obligatoire quand `state` vaut `remark` ou `damage` (validator + service). */
  note?: string | null
}

export type BoatInspectionItemRow = {
  id: number
  itemKey: string
  state: InspectionItemState
  note: string | null
}

/**
 * Instantané renvoyé au client quand un PUT rejoué depuis la file hors-ligne
 * arrive sur une inspection modifiée entre-temps (#622) — mêmes champs que le
 * formulaire, pour que la modale de résolution puisse les confronter.
 */
export interface ConflictInspectionSnapshot {
  id: number
  updatedAt: string
  performedAt: string
  fuelLevel: number | null
  engineHours: string | null
  notes: string | null
}
