import type { DateTime } from 'luxon'
import { EQUIPMENT_REFERENCE_TYPES } from '#shared/constants/equipment_action'

export const INCIDENT_TYPES = [
  'grounding',
  'flooding',
  'rigging_failure',
  'engine_failure',
  'collision',
  'fire',
  'theft_vandalism',
  'other',
] as const

export type IncidentType = (typeof INCIDENT_TYPES)[number]

export type IncidentStatus = 'open' | 'in_progress' | 'closed'

/**
 * Ce qu'un incident peut viser (#813) : les cinq familles d'équipement des
 * tâches, plus la pièce moteur. `EquipmentReferenceType` n'est volontairement
 * pas étendu — il sert de clé de `Record` dans les helpers de tâches et de
 * `CHECK` SQL sur `boat_equipment_actions`, qui ignorent tous les deux la pièce.
 */
export const INCIDENT_TARGET_TYPES = [...EQUIPMENT_REFERENCE_TYPES, 'engine_part'] as const

export type IncidentTargetType = (typeof INCIDENT_TARGET_TYPES)[number]

/** Équipement ou pièce visé par un incident — au plus un par incident. */
export interface IncidentTargetRef {
  type: IncidentTargetType
  id: number
}

/** Nom de la colonne camelCase portant la FK de la cible. */
export type IncidentTargetField =
  | 'boatEngineId'
  | 'boatSailId'
  | 'boatRigId'
  | 'boatSafetyEquipmentId'
  | 'boatGenericEquipmentId'
  | 'boatEnginePartId'

/** Colonnes FK d'un incident (ou d'un payload) — `undefined` = non renseigné. */
export type IncidentTargetColumns = Partial<Record<IncidentTargetField, number | null>>

/**
 * Cible d'un incident telle que servie au front. `name` est la valeur brute
 * à traduire ou afficher selon `type` : `brand model` (ou n° de série) pour un
 * moteur, clé `sailType` pour une voile, clé `equipmentType` pour la sécurité,
 * `name` pour un générique, `designation` pour une pièce, `null` pour le
 * gréement. `engineId` n'est posé que pour une pièce (lien vers sa page).
 */
export interface IncidentTargetSummary {
  type: IncidentTargetType
  id: number
  name: string | null
  engineId?: number
}

/** Pré-remplissage du formulaire d'incident depuis un point d'entrée équipement. */
export interface IncidentFormPrefill {
  target: IncidentTargetRef
  /** Libellé affiché sur la puce verrouillée — obligatoire pour une pièce, que la fiche bateau ne connaît pas. */
  targetLabel?: string
}

export type CreateIncidentPayload = IncidentTargetColumns & {
  occurredAt: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  type: IncidentType
  location?: string | null
  description: string
  insuranceClaimed?: boolean
  insuranceClaimRef?: string | null
}

export type UpdateIncidentPayload = IncidentTargetColumns & {
  occurredAt?: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  type?: IncidentType
  location?: string | null
  description?: string
  insuranceClaimed?: boolean
  insuranceClaimRef?: string | null
  status?: IncidentStatus
  /**
   * Verrou optimiste (#970) : `updatedAt` de l'incident tel que le formulaire
   * l'a lu. Envoyé par le rejeu hors-ligne ; s'il a bougé, le service lève
   * `BoatIncidentConflictError` au lieu d'écraser la version du serveur.
   */
  expectedUpdatedAt?: string
}

/**
 * La version serveur d'un incident, dans la forme que la modale de conflit
 * compare à la saisie locale (#970). Mêmes champs que
 * `FIELDS_BY_TYPE['update-incident']`, plus l'`updatedAt` qui sert de nouveau
 * jeton au rejeu.
 */
export interface ConflictIncidentSnapshot {
  id: number
  updatedAt: string
  occurredAt: string
  type: IncidentType
  status: IncidentStatus
  location: string | null
  description: string
  insuranceClaimed: boolean
  insuranceClaimRef: string | null
}

export type BoatIncidentRow = Record<IncidentTargetField, number | null> & {
  id: number
  boatId: number
  occurredAt: string
  type: IncidentType
  location: string | null
  description: string
  insuranceClaimed: boolean
  insuranceClaimRef: string | null
  status: IncidentStatus
  closedAt: string | null
  createdAt: string
  /** ISO — renvoyé en `_expectedUpdatedAt` au rejeu hors-ligne (#970). */
  updatedAt: string
  target: IncidentTargetSummary | null
  /** Photos jointes (#814) — compteur seul, les médias vivent sur la page de détail. */
  photosCount: number
}
