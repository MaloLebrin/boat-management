import type { AppLocale } from '#shared/helpers/locale_path'

export const AI_MODEL_OVERRIDES = [
  'mistral-small-latest',
  'mistral-medium-latest',
  'mistral-large-latest',
] as const
export type AiModelOverride = (typeof AI_MODEL_OVERRIDES)[number]

export type AiAnalysisStatus = 'pending' | 'running' | 'done' | 'failed'

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiAnalysisResult {
  id: number
  kind: string
  responseText: string
  createdAt: string
  status: AiAnalysisStatus
}

/**
 * Langue dans laquelle les suggestions IA sont rédigées (#460). C'est la locale
 * de l'utilisateur au moment de la génération : elle est passée au prompt et
 * stockée sur l'analyse pour ne pas ressortir un texte français dans une UI
 * anglaise (et inversement).
 */
export type AiSuggestionLocale = AppLocale

export interface AiSuggestion {
  text: string
}

export interface FleetAnalysisInput {
  boats: Array<{
    name: string
    propulsionType: string | null
    enginesCount: number
    sailsCount: number
    hasRig: boolean
  }>
  urgentMaintenance: Array<{
    boatName: string
    title: string
    kind: 'date' | 'hours'
    dueAt: string | null
    dueEngineHours: number | null
    currentEngineHours: number | null
  }>
  stats: {
    boats: number
    engines: number
    sails: number
    rigs: number
    urgentMaintenance: number
  }
}

export interface BoatSuggestionsInput {
  boat: {
    id: number
    name: string
    type: string | null
    propulsionType: string | null
    yearBuilt: number | null
    manufacturer: string | null
    model: string | null
    homePort: string | null
    navigationCategory: string | null
    engines: Array<{
      kind: string
      fuel: string | null
      hours: number | null
      brand: string | null
      model: string | null
    }>
    sails: Array<{
      sailType: string
      manufacturedAt: string | null
      status: string
    }>
    rig: { rigType: string; status: string } | null
    safetyEquipment: Array<{
      equipmentType: string
      expiryDate: string | null
      status: string
    }>
  }
  maintenanceTasks: Array<{
    title: string
    subject: string
    dueAt: string | null
    status: string
  }>
  maintenanceEvents: Array<{
    title: string
    subject: string
    performedAt: string
  }>
}
