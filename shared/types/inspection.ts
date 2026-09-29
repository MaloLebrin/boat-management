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
  /** Signature (#889) : l'inspection est figée, plus aucune modification. */
  lockedAt: string | null
  /** Dernier envoi du PDF signé au client (#889). */
  sentAt: string | null
  /** Signataires, sans le tracé — il n'a rien à faire dans les props (#889). */
  signatures: InspectionSignatureSummary[]
}

/** Partie qui signe l'état des lieux (#889). */
export const INSPECTION_SIGNATURE_ROLES = ['client', 'staff'] as const
export type InspectionSignatureRole = (typeof INSPECTION_SIGNATURE_ROLES)[number]

export interface InspectionSignatureSummary {
  role: InspectionSignatureRole
  signerName: string
  signedAt: string
}

/** Charge utile de `POST …/inspections/:id/sign` : un PNG par partie (#889). */
export interface SignInspectionPayload {
  clientName: string
  /** `data:image/png;base64,…` produit par le pad de signature. */
  clientSignature: string
  staffSignature: string
}

/** Tracé décodé, prêt pour la base et le PDF. */
export interface InspectionSignatureInput {
  role: InspectionSignatureRole
  signerName: string
  image: Uint8Array
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

/** Ligne de checklist d'un état des lieux imprimé (#889) — `state: null` = non contrôlé. */
export interface InspectionReportRow {
  itemKey: string
  labelKey: string
  state: InspectionItemState | null
  note: string | null
}

export interface InspectionReportSection {
  key: string
  titleKey: string
  rows: InspectionReportRow[]
}

/** Point dont le constat a changé entre le départ et le retour (#889). */
export interface InspectionReportChange {
  itemKey: string
  labelKey: string
  before: InspectionItemState | null
  after: InspectionItemState | null
  note: string | null
  degraded: boolean
}

export interface InspectionReportTally {
  ok: number
  remark: number
  damage: number
  notInspected: number
}

/**
 * Tout ce qu'imprime un état des lieux (#889), déjà résolu : le service PDF ne
 * touche ni à la base ni au réseau. Les dates sont en ISO.
 */
export interface InspectionPdfData {
  inspectionId: number
  kind: InspectionKind
  performedAt: string
  fuelLevel: number | null
  engineHours: string | null
  notes: string | null
  lockedAt: string | null
  boat: { name: string; category: BoatCategory | null }
  reservation: { id: number; startsAt: string; endsAt: string }
  client: { name: string; email: string | null; phone: string | null }
  items: Array<{ itemKey: string; state: InspectionItemState; note: string | null }>
  /** Vignettes JPEG récupérées ; `photoCount` compte toutes les photos de l'inspection. */
  photos: Uint8Array[]
  photoCount: number
  defects: Array<{ label: string; notes: string | null }>
  /** Départ en regard d'un retour — `null` pour un départ, ou un retour sans départ. */
  counterpart: {
    performedAt: string
    fuelLevel: number | null
    engineHours: string | null
    items: Array<{ itemKey: string; state: InspectionItemState; note: string | null }>
  } | null
  signatures: Array<{
    role: InspectionSignatureRole
    signerName: string
    signedAt: string
    image: Uint8Array
  }>
}
