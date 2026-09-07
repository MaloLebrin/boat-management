import type { AppLocale } from '#shared/helpers/locale_path'
import type { DiagnosticSheetSlug } from '#shared/types/diagnostic'

/**
 * Fournisseurs IA supportés en BYOK (#clé API par organisation). `mistral`
 * reste le fournisseur de l'app : sans clé d'org, les appels partent sur la
 * clé Mistral de l'app et le quota mensuel s'applique.
 */
export const AI_PROVIDERS = ['mistral', 'anthropic', 'openai', 'google'] as const
export type AiProvider = (typeof AI_PROVIDERS)[number]

/** Noms commerciaux — des marques, jamais traduites (pas de clé i18n). */
export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  mistral: 'Mistral',
  anthropic: 'Claude',
  openai: 'ChatGPT',
  google: 'Gemini',
}

export const AI_MODELS_BY_PROVIDER = {
  mistral: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
  anthropic: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-5'],
  openai: ['gpt-5.1', 'gpt-5', 'gpt-5-mini'],
  google: ['gemini-2.5-flash', 'gemini-2.5-pro'],
} as const satisfies Record<AiProvider, readonly string[]>

/** Union de tous les modèles sélectionnables (validation de `aiModelOverride`). */
export const ALL_AI_MODELS = Object.values(AI_MODELS_BY_PROVIDER).flat()

/** Défaut par fournisseur — même philosophie « petit modèle » que mistral-small. */
export const DEFAULT_AI_MODEL_BY_PROVIDER: Record<AiProvider, string> = {
  mistral: 'mistral-small-latest',
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-5-mini',
  google: 'gemini-2.5-flash',
}

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === 'string' && (AI_PROVIDERS as readonly string[]).includes(value)
}

export function modelBelongsToProvider(model: string, provider: AiProvider): boolean {
  return (AI_MODELS_BY_PROVIDER[provider] as readonly string[]).includes(model)
}

/**
 * Clé i18n sûre pour un identifiant de modèle : `gpt-5.1` → `gpt-5-1` — un
 * point dans la clé casserait la résolution par chemin des JSON de langue.
 */
export function aiModelI18nKey(model: string): string {
  return model.replaceAll('.', '-')
}

/**
 * Outil que le modèle peut appeler pendant un tour (#642). Format neutre,
 * traduit par chaque adaptateur de `AiService` vers son shape natif.
 */
export interface AiToolDefinition {
  name: string
  description: string
  /** JSON Schema d'objet, envoyé tel quel aux quatre fournisseurs. */
  parameters: Record<string, unknown>
}

/** Appel d'outil rendu par le modèle — `id` à renvoyer avec le résultat. */
export interface AiToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/**
 * Options d'un appel `AiService.chat`. Sans `provider`, l'appel part chez
 * Mistral avec la clé de l'app. Un `model` étranger au fournisseur est ignoré
 * (fallback sur le défaut du fournisseur) : `aiModelOverride` peut rester
 * configuré pour un autre provider que celui de l'appel.
 */
export interface AiChatOptions {
  provider?: AiProvider | null
  model?: string | null
  apiKey?: string | null
  tools?: AiToolDefinition[]
}

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
      family: string | null
      hours: number | null
      installHours: number | null
      brand: string | null
      model: string | null
      /** Désignations des pièces usées (`worn`/`to_replace`/`damaged`). */
      partsToReplace: string[]
      /** Désignations des pièces sous leur seuil d'alerte de stock. */
      lowStockParts: string[]
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
      /**
       * Expiration effective : `expiryDate` ou, à défaut, date dérivée de la
       * durée de vie Division 240 (`resolveEffectiveExpiry`).
       */
      effectiveExpiryDate: string | null
      status: string
    }>
    genericEquipment: Array<{
      category: string
      brand: string | null
      status: string
      purchasedAt: string | null
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

/**
 * Contexte des suggestions IA d'un moteur (`kind: 'engine_suggestions'`).
 * Même contrat de sortie que les suggestions bateau (`AiSuggestion[]`), mais
 * centré sur un moteur : pièces (usure, stock), tâches/événements du moteur et
 * intervalles du catalogue d'opérations standard de sa famille (#581).
 */
export interface EngineSuggestionsInput {
  engine: {
    kind: string
    fuel: string | null
    family: string | null
    brand: string | null
    model: string | null
    powerHp: number | null
    hours: number | null
    installHours: number | null
    manufacturedAt: string | null
    status: string
  }
  parts: Array<{
    designation: string
    reference: string | null
    wearState: string | null
    stock: number | null
    minStockAlert: number | null
    purchasedAt: string | null
  }>
  maintenanceTasks: Array<{
    title: string
    subject: string
    status: string
    dueAt: string | null
    dueEngineHours: number | null
  }>
  /** 5 derniers événements de maintenance liés au moteur. */
  maintenanceEvents: Array<{
    title: string
    subject: string
    performedAt: string
  }>
  /** Opérations du catalogue standard pour la famille du moteur, label déjà localisé. */
  catalogOperations: Array<{
    label: string
    intervalMonths: number | null
    intervalEngineHours: number | null
  }>
}
