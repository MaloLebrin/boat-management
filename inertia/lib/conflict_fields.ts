import type { ConflictState } from '~/composables/use_offline_queue'
import {
  CLOSE_NAVIGATION_LOG_ACTION,
  UPDATE_INCIDENT_ACTION,
  UPDATE_INSPECTION_ACTION,
  UPDATE_NAVIGATION_LOG_ACTION,
  UPDATE_NAVIGATION_LOG_ENTRY_ACTION,
  UPDATE_SHEET_ITEM_ACTION,
  type OfflineActionType,
} from '#shared/constants/offline_queue'

/**
 * Ce que la modale de conflit affiche pour chaque type d'action (#970, extrait
 * de `ConflictResolutionModal.vue`).
 *
 * Les clés viennent de `shared/constants/offline_queue.ts` (#726) : le même
 * identifiant que le contrôleur flashe et que le formulaire enfile, donc un
 * renommage casse ici à la compilation au lieu d'ouvrir une modale vide. La
 * garde `offline_protocol_vocabulary.spec.ts` relit ce bloc.
 */
export const FIELDS_BY_TYPE: Partial<Record<OfflineActionType, string[]>> = {
  [UPDATE_NAVIGATION_LOG_ACTION]: ['windForceBeaufort', 'seaState', 'crewCount', 'notes'],
  [CLOSE_NAVIGATION_LOG_ACTION]: [
    'arrivedAt',
    'arrivalPortName',
    'distanceNm',
    'engineHoursEnd',
    'fuelConsumedLiters',
    'windForceBeaufort',
    'seaState',
    'crewCount',
    'notes',
  ],
  [UPDATE_NAVIGATION_LOG_ENTRY_ACTION]: [
    'recordedAt',
    'latitude',
    'longitude',
    'cogDeg',
    'sogKn',
    'sailConfig',
    'note',
  ],
  [UPDATE_SHEET_ITEM_ACTION]: ['isDone', 'notes'],
  [UPDATE_INSPECTION_ACTION]: ['performedAt', 'fuelLevel', 'engineHours', 'notes'],
  [UPDATE_INCIDENT_ACTION]: [
    'occurredAt',
    'type',
    'status',
    'location',
    'description',
    'insuranceClaimed',
    'insuranceClaimRef',
  ],
}

// Chaque type d'action a son propre namespace de libellés de champs
const LABEL_PREFIX_BY_TYPE: Partial<Record<OfflineActionType, string>> = {
  [UPDATE_SHEET_ITEM_ACTION]: 'common.sheetItem.field',
  [UPDATE_INSPECTION_ACTION]: 'inspections.fields',
  [UPDATE_INCIDENT_ACTION]: 'incidents.fields',
}

/** Valeurs d'énumération traduites plutôt qu'affichées brutes (`engine_failure`). */
const VALUE_PREFIX_BY_FIELD: Partial<Record<OfflineActionType, Record<string, string>>> = {
  [UPDATE_INCIDENT_ACTION]: { type: 'incidents.type', status: 'incidents.status' },
}

// La description parle de « cette sortie » : un état des lieux a la sienne (#622).
const DESCRIPTION_BY_TYPE: Partial<Record<OfflineActionType, string>> = {
  [UPDATE_INSPECTION_ACTION]: 'common.offline.conflict.descriptionInspection',
  [UPDATE_INCIDENT_ACTION]: 'common.offline.conflict.descriptionIncident',
}

/**
 * Champs horodatés : la saisie locale est une heure murale (`2026-07-15T10:00`),
 * le serveur rend un ISO UTC. Comparés en chaînes, ils différeraient toujours.
 */
const DATE_FIELDS = new Set(['occurredAt', 'recordedAt', 'arrivedAt', 'performedAt'])

type Translate = (key: string, params?: Record<string, string>) => string
type FormatDate = (value: string) => string

export interface ConflictRow {
  key: string
  label: string
  local: string
  server: string
  differs: boolean
}

const EMPTY = '—'

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

function sameValue(key: string, local: unknown, server: unknown): boolean {
  if (DATE_FIELDS.has(key) && !isEmpty(local) && !isEmpty(server)) {
    const a = Date.parse(String(local))
    const b = Date.parse(String(server))
    if (!Number.isNaN(a) && !Number.isNaN(b))
      return Math.floor(a / 60_000) === Math.floor(b / 60_000)
  }
  return String(local ?? '') === String(server ?? '')
}

/** Lignes champ par champ d'un conflit : saisie locale face à la ligne du serveur. */
export function conflictRows(
  conflict: ConflictState,
  t: Translate,
  formatDateTime: FormatDate
): ConflictRow[] {
  const { type } = conflict.action
  const labelPrefix = LABEL_PREFIX_BY_TYPE[type] ?? 'common.navigationLog.field'
  const valuePrefixes = VALUE_PREFIX_BY_FIELD[type] ?? {}

  function display(key: string, value: unknown): string {
    if (isEmpty(value)) return EMPTY
    if (typeof value === 'boolean') return t(value ? 'common.yes' : 'common.no')
    if (DATE_FIELDS.has(key)) return formatDateTime(String(value))
    const prefix = valuePrefixes[key]
    return prefix ? t(`${prefix}.${String(value)}`) : String(value)
  }

  return (FIELDS_BY_TYPE[type] ?? [])
    .map((key) => ({
      key,
      rawLocal: conflict.action.payload[key],
      rawServer: conflict.serverData[key],
    }))
    .filter((row) => !isEmpty(row.rawLocal) || !isEmpty(row.rawServer))
    .map(({ key, rawLocal, rawServer }) => ({
      key,
      label: t(`${labelPrefix}.${key}`),
      local: display(key, rawLocal),
      server: display(key, rawServer),
      differs: !sameValue(key, rawLocal, rawServer),
    }))
}

/** Phrase d'introduction d'un conflit seul, selon ce qu'il touche. */
export function conflictDescriptionKey(type: OfflineActionType): string {
  return DESCRIPTION_BY_TYPE[type] ?? 'common.offline.conflict.description'
}

export interface ConflictGroup {
  key: string
  boatName: string | null
  type: OfflineActionType
  conflicts: ConflictState[]
}

/**
 * Après plusieurs semaines hors-ligne, les conflits arrivent par dizaines :
 * groupés par bateau puis par type, dans l'ordre de la file (#970). Le nom du
 * bateau vient de `conflictData` (`toConflictData` côté serveur).
 */
export function groupConflicts(conflicts: ConflictState[]): ConflictGroup[] {
  const groups = new Map<string, ConflictGroup>()
  for (const conflict of conflicts) {
    const boatId = /^\/boats\/(\d+)/.exec(conflict.action.url)?.[1] ?? ''
    const key = `${boatId}:${conflict.action.type}`
    const boatName =
      typeof conflict.serverData.boatName === 'string' ? conflict.serverData.boatName : null
    const group = groups.get(key) ?? { key, boatName, type: conflict.action.type, conflicts: [] }
    group.conflicts.push(conflict)
    groups.set(key, group)
  }
  return [...groups.values()]
}
