import type { EngineFamily } from '#shared/types/engine_catalog'

/**
 * Fiches de diagnostic panne. Les huit premières viennent de #515 (hors-bord
 * 2 temps) ; les suivantes de #576 (in-bord diesel, embase Z, groupe).
 *
 * Un slug est un **préfixe de clé persistée** (`boat_engine_diagnostic_checks.step_key`) :
 * on en insère, on n'en renomme jamais. D'où les slugs distincts entre familles
 * (`cooling` hors-bord et `inboard-cooling` in-bord) plutôt qu'une fiche unique
 * dont le contenu changerait de sens selon le moteur.
 */
export const DIAGNOSTIC_SHEET_SLUGS = [
  'compression',
  'ignition',
  'fuel',
  'cooling',
  'gearcase',
  'electrical',
  'timing',
  'first-contact',
  'inboard-cooling',
  'diesel-fuel',
  'diesel-smoke',
  'wet-exhaust',
  'gearbox',
  'shaft-line',
  'saildrive',
] as const

export type DiagnosticSheetSlug = (typeof DIAGNOSTIC_SHEET_SLUGS)[number]

/**
 * Préfixes des checklists globales (#576) — une par grande famille, chacune
 * avec son propre espace de clés pour que les cases déjà cochées d'un hors-bord
 * ne se mélangent jamais à celles d'un in-bord.
 */
export const DIAGNOSTIC_GLOBAL_SCOPES = ['global', 'global-inboard'] as const

export type DiagnosticGlobalScope = (typeof DIAGNOSTIC_GLOBAL_SCOPES)[number]

export const DIAGNOSTIC_RESET_SCOPES = [
  'all',
  ...DIAGNOSTIC_GLOBAL_SCOPES,
  ...DIAGNOSTIC_SHEET_SLUGS,
] as const

export type DiagnosticResetScope = (typeof DIAGNOSTIC_RESET_SCOPES)[number]

export interface DiagnosticStep {
  /** Clé stable persistée en base (`<scope>.<slug>`) — ne jamais renommer. */
  key: string
  labelKey: string
  detailKey?: string
  /** L'étape renvoie vers une fiche détaillée. */
  linkedSheet?: DiagnosticSheetSlug
}

export interface DiagnosticSection {
  titleKey?: string
  /**
   * Restreint la section à certaines familles (#576). Absent = toutes les
   * familles de la fiche. Sert aux fiches **élargies** plutôt que dupliquées
   * (`electrical`) : la batterie et le solénoïde valent pour tout le monde, la
   * courroie d'alternateur et les bougies de préchauffage non.
   */
  families?: readonly EngineFamily[]
  steps: readonly DiagnosticStep[]
}

export interface DiagnosticTable {
  id: string
  headerKeys: readonly string[]
  rowKeys: ReadonlyArray<readonly string[]>
}

export interface DiagnosticSheet {
  slug: DiagnosticSheetSlug
  titleKey: string
  introKey?: string
  /**
   * Familles de motorisation auxquelles la fiche s'applique (#576) — même
   * mécanique que `SparePartAssembly.families` (#574). C'est elle qui décide de
   * l'éligibilité au diagnostic, là où `kind === 'outboard' && strokeType === '2_stroke'`
   * fermait le parcours à l'in-bord diesel. Jamais vide.
   */
  families: readonly EngineFamily[]
  /** Fiche impliquant le démarrage du moteur → rappel de sécurité avant essai. */
  requiresRunningEngine: boolean
  /**
   * Rappel affiché quand `requiresRunningEngine` est vrai. Par défaut celui du
   * hors-bord (« jamais à sec, bac d'eau ou oreilles de rinçage ») ; un in-bord
   * n'a ni l'un ni l'autre, c'est sa vanne de coque qu'il faut ouvrir (#576).
   */
  runningEngineWarning?: { titleKey: string; textKey: string }
  /** Fiche non liée à un moteur en base (achat d'occasion) : état non persisté. */
  standalone?: boolean
  sections: readonly DiagnosticSection[]
  warningKeys: readonly string[]
  tables?: readonly DiagnosticTable[]
  noteKeys?: readonly string[]
}

export interface DiagnosticGlobalChecklist {
  /** Préfixe des clés d'étapes de cette checklist (`global`, `global-inboard`). */
  scope: DiagnosticGlobalScope
  /** Familles servies par cette checklist — disjointes d'une checklist à l'autre. */
  families: readonly EngineFamily[]
  titleKey: string
  introKey: string
  steps: readonly DiagnosticStep[]
  warningKeys: readonly string[]
  /** Intitulé des encarts d'avertissement de la checklist. */
  warningTitleKey: string
}

export interface DiagnosticToolRow {
  id: string
  nameKey: string
  usageKey: string
  priceKey: string
}

/** Ligne moteur envoyée par le backend à la page index « Panne ». */
export interface DiagnosticEngineRow {
  id: number
  boatId: number
  boatName: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  kind: string
  family: EngineFamily | null
  status: string
  /** Nombre d'étapes cochées sur la checklist globale du moteur. */
  checkedCount: number
  /**
   * Nombre total d'étapes de cette checklist globale (#576) : il dépend de la
   * famille, la liste n'étant plus la même pour un hors-bord et un in-bord.
   */
  totalSteps: number
}
