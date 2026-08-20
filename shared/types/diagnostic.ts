export const DIAGNOSTIC_SHEET_SLUGS = [
  'compression',
  'ignition',
  'fuel',
  'cooling',
  'gearcase',
  'electrical',
  'timing',
  'first-contact',
] as const

export type DiagnosticSheetSlug = (typeof DIAGNOSTIC_SHEET_SLUGS)[number]

export const DIAGNOSTIC_RESET_SCOPES = ['all', 'global', ...DIAGNOSTIC_SHEET_SLUGS] as const

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
  /** Fiche impliquant le démarrage du moteur → rappel « jamais à sec ». */
  requiresRunningEngine: boolean
  /** Fiche non liée à un moteur en base (achat d'occasion) : état non persisté. */
  standalone?: boolean
  sections: readonly DiagnosticSection[]
  warningKeys: readonly string[]
  tables?: readonly DiagnosticTable[]
  noteKeys?: readonly string[]
}

export interface DiagnosticGlobalChecklist {
  titleKey: string
  introKey: string
  steps: readonly DiagnosticStep[]
  warningKeys: readonly string[]
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
  kind: string
  status: string
  /** Nombre d'étapes cochées sur la checklist globale. */
  checkedCount: number
}
