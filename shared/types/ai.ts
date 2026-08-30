import type { AppLocale } from '#shared/helpers/locale_path'
import type { DiagnosticSheetSlug } from '#shared/types/diagnostic'

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

/**
 * Diagnostic de panne moteur assisté par IA (#516) — hors-bord 2 temps.
 *
 * Deux modes : `symptoms` (orientation initiale depuis une description en
 * texte libre) et `progress` (relecture de la progression dans les checklists
 * de #515 : étapes cochées + notes/résultats saisis).
 */
export const ENGINE_DIAGNOSIS_MODES = ['symptoms', 'progress'] as const
export type EngineDiagnosisMode = (typeof ENGINE_DIAGNOSIS_MODES)[number]

/** Réponse structurée attendue du modèle pour un diagnostic moteur. */
export interface EngineDiagnosisResult {
  /** Famille de panne probable / lecture de la progression. */
  summary: string
  /** Fiche recommandée — toujours une fiche existante de #515. */
  recommendedSheet: DiagnosticSheetSlug
  /** 2–3 causes probables, ordonnées de la moins chère à la plus chère. */
  causes: string[]
  /** Prochaine étape concrète à réaliser. */
  nextStep: string
}

/** Diagnostic persisté renvoyé à la page checklist (résultat + horodatage). */
export interface EngineDiagnosisPanelData {
  result: EngineDiagnosisResult
  createdAt: string
}

export interface EngineDiagnosisInput {
  engine: {
    brand: string | null
    model: string | null
    hours: number | null
    strokeType: string | null
    /**
     * Famille de motorisation résolue (#576) — c'est elle qui cadre le prompt
     * et la liste des fiches recommandables. `null` reste accepté : le prompt
     * retombe alors sur le corpus hors-bord 2 temps de #516.
     */
    family: string | null
  }
  parts: Array<{
    designation: string
    wearState: string | null
  }>
  maintenanceEvents: Array<{
    title: string
    subject: string
    performedAt: string
  }>
  checklist: {
    /** Clés stables cochées (`<scope>.<slug>`) — cf. diagnostic_content.ts. */
    checkedStepKeys: string[]
    totalGlobalSteps: number
  }
  mode: EngineDiagnosisMode
  /**
   * Texte saisi par l'utilisateur : symptômes décrits (mode `symptoms`) ou
   * notes/résultats relevés (mode `progress`, optionnel).
   */
  userText: string
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
