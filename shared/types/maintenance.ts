import type { DateTime } from 'luxon'
import type { MaintenanceSubject } from '#shared/constants/maintenance/maintenance_subjects'

/** Alias historique de `MaintenanceSubject` — même vocabulaire, une seule source. */
export type MaintenanceTaskSubject = MaintenanceSubject

export type MaintenancePartInput = {
  name?: string | null
  quantity?: string | null
  notes?: string | null
  enginePartId?: number | null
  unitPrice?: string | null
}

export type CreateMaintenancePayload = {
  subject: MaintenanceSubject
  boatEngineId?: number | null
  boatSailId?: number | null
  boatRigId?: number | null
  boatSafetyEquipmentId?: number | null
  engineCaption?: string | null
  sailCaption?: string | null
  performedAt: Date | string | DateTime
  title: string
  notes?: string | null
  parts?: Array<MaintenancePartInput>
}

export type MaintenanceEventPartRow = {
  id: number
  name: string
  quantity: number | null
  unitPrice: number | null
  totalCost: number | null
  enginePartId: number | null
}

export type MaintenanceEventRow = {
  id: number
  boatId: number
  boatName: string
  subject: string
  title: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  sailCaption: string | null
  boatEngineId: number | null
  boatSailId: number | null
  boatRigId: number | null
  boatSafetyEquipmentId: number | null
  parts: MaintenanceEventPartRow[]
  totalCost: number | null
}

export type MaintenanceHistorySort = 'recent' | 'oldest'

export type MaintenanceHistoryFilters = {
  q: string
  subject: MaintenanceTaskSubject | ''
  boatId: number | null
  dateFrom: string
  dateTo: string
  sort: MaintenanceHistorySort
  page: number
  perPage: number
}

export type MaintenanceHistoryStats = {
  totalEvents: number
  totalParts: number
  totalBoats: number
  totalCost: number | null
}

export type MaintenanceBoatOption = { id: number; name: string }

export type MaintenanceHistoryPaginated = {
  data: MaintenanceEventRow[]
  meta: { total: number; perPage: number; currentPage: number; lastPage: number }
}

export type CreateMaintenanceTaskPayload = {
  subject: MaintenanceTaskSubject
  title: string
  notes?: string | null
  boatEngineId?: number | null
  boatSailId?: number | null
  boatRigId?: number | null
  dueAt?: Date | string | DateTime | null
  recurrenceIntervalMonths?: number | null
  dueEngineHours?: number | null
  recurrenceIntervalEngineHours?: number | null
}

export type MarkTaskDonePayload = {
  doneAt?: Date | string | DateTime
  doneEngineHours?: number | null
}

export type BoatMaintenanceBadge = {
  urgentCount: number
  upcomingCount: number
  nextDueAt: string | null
}

/**
 * Types de fiches de maintenance guidées (#583). Les cinq premiers sont
 * historiques ; `moteur_saison`, `carenage`, `catamaran` et `semi_rigide`
 * étendent le corpus au-delà du voilier. L'ordre est celui d'affichage.
 */
export const SHEET_TYPES = [
  'entretien',
  'montage',
  'hivernage',
  'dehivernage',
  'atelier',
  'moteur_saison',
  'carenage',
  'catamaran',
  'semi_rigide',
] as const

export type SheetType = (typeof SHEET_TYPES)[number]

/**
 * Item du corpus des fiches guidées (#583).
 *
 * `key` (`'hivernage.drain_engine'`…) est persistée en base
 * (`boat_maintenance_sheet_items.template_key`) et ne doit JAMAIS être
 * renommée ; on peut en insérer de nouvelles à n'importe quelle position —
 * même contrat que `part_key` (pièces) et `step_key` (diagnostic).
 */
export interface MaintenanceSheetTemplateItem {
  /** `'<type>.<slug>'` — stable à vie. */
  key: string
  /** `'maintenance.sheets.<type>.items.<slug>'` — présent dans les deux locales. */
  labelKey: string
}

export interface MaintenanceSheetTemplate {
  type: SheetType
  /** `'maintenance.sheets.<type>.label'` — libellé du type de fiche. */
  labelKey: string
  items: readonly MaintenanceSheetTemplateItem[]
}

/** Item résolu dans la locale de l'utilisateur, prêt à être copié en base. */
export type SheetTemplateItem = { templateKey: string; label: string; position: number }

export type CreateSheetPayload = {
  type: SheetType
  title: string
  performedAt: Date | DateTime
  notes: string | null
}

export type UpdateItemPayload = {
  isDone: boolean
  notes: string | null
  /** Détection de conflit au rejeu hors-ligne (#490) — absent pour une édition en ligne directe. */
  expectedUpdatedAt?: string
}

/** Snapshot renvoyé au client quand un PUT rejoué entre en conflit (#490). */
export interface ConflictSheetItemSnapshot {
  id: number
  updatedAt: string
  isDone: boolean
  notes: string | null
}

export type MaintenanceDateBadgeRow = { boatId: number | string; nextDueAt: string | null }

export type MaintenanceMaxDoneRow = { boatEngineId: number | string; maxDone: number | string }

export type MaintenanceBadgeOpts = {
  urgentWithinDays?: number
  urgentWithinEngineHours?: number
}

/**
 * Familles de moteur du catalogue d'opérations standard (#581).
 *
 * Repli assumé en attendant `ENGINE_FAMILIES` (#574) : la famille est dérivée
 * du couple `kind` / `fuel` déjà saisi sur `boat_engines`. Elle ne sert qu'à
 * écarter les opérations incohérentes (pas de bougies sur un diesel) — jamais
 * à restreindre la saisie libre.
 */
export const MAINTENANCE_ENGINE_FAMILIES = [
  'inboard_diesel',
  'inboard_petrol',
  'outboard_petrol',
  'outboard_diesel',
  'electric',
  'hybrid',
] as const

export type MaintenanceEngineFamily = (typeof MAINTENANCE_ENGINE_FAMILIES)[number]

/**
 * Opération de maintenance standard du catalogue (#581).
 *
 * `key` est un identifiant **stable à vie** : il préfixe la clé i18n, sert de
 * valeur d'option dans la combobox et pourra un jour être persisté
 * (`operation_key`) pour des statistiques par opération. On peut en insérer de
 * nouvelles à n'importe quelle position, jamais en renommer une.
 *
 * Les intervalles sont des **défauts indicatifs**, pas une prescription : ils
 * pré-remplissent un champ vide et le manuel constructeur reste la référence.
 */
export interface MaintenanceOperation {
  /** `'engine.oil_change'` — préfixé par le sujet, stable à vie. */
  key: string
  subject: MaintenanceSubject
  /** `'maintenance.operations.engine.oil_change.label'`. */
  labelKey: string
  /** Familles moteur concernées ; absent = toutes. */
  families?: readonly MaintenanceEngineFamily[]
  defaultIntervalMonths?: number
  defaultIntervalEngineHours?: number
  /** Précision affichée sous le libellé (« selon le manuel constructeur »…). */
  noteKey?: string
}
