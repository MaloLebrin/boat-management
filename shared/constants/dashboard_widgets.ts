/**
 * Registre des widgets du tableau de bord personnalisable.
 *
 * Source de vérité partagée entre le contrôleur (quelles données calculer),
 * le résolveur de disposition (`shared/helpers/dashboard_layout.ts`) et la
 * page Vue (quel composant rendre, dans quelle zone). Ajouter un widget =
 * une entrée ici + une branche dans `DashboardWidget.vue` + ses données côté
 * `HomeController` : la disposition stockée des utilisateurs qui ont déjà
 * personnalisé le fait apparaître à sa position par défaut (`hidden` explicite).
 */
export const DASHBOARD_WIDGET_IDS = [
  'kpis',
  'attention',
  'at_sea',
  'upcoming_reservations',
  'activity',
  'boats',
  'ai_panel',
  'spend',
  'ports',
  'planned_tasks',
  'notifications',
] as const

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number]

/**
 * `top` : bandeau KPI sous l'en-tête (masquable, jamais réordonnable) ;
 * `main` : colonne principale (2/3 à partir de `xl`) ; `side` : colonne latérale.
 */
export const DASHBOARD_WIDGET_ZONES = ['top', 'main', 'side'] as const

export type DashboardWidgetZone = (typeof DASHBOARD_WIDGET_ZONES)[number]

/** Zones dont l'ordre est modifiable par l'utilisateur. */
export const DASHBOARD_REORDERABLE_ZONES: readonly DashboardWidgetZone[] = ['main', 'side']

export interface DashboardWidgetDefinition {
  zone: DashboardWidgetZone
  /**
   * `half` : deux widgets `half` consécutifs et visibles se partagent une ligne
   * dès `md` (« En mer » + « Prochains départs ») ; un `half` isolé prend
   * toute la largeur.
   */
  size: 'full' | 'half'
}

export const DASHBOARD_WIDGETS: Record<DashboardWidgetId, DashboardWidgetDefinition> = {
  kpis: { zone: 'top', size: 'full' },
  attention: { zone: 'main', size: 'full' },
  at_sea: { zone: 'main', size: 'half' },
  upcoming_reservations: { zone: 'main', size: 'half' },
  activity: { zone: 'main', size: 'full' },
  boats: { zone: 'main', size: 'full' },
  ai_panel: { zone: 'side', size: 'full' },
  spend: { zone: 'side', size: 'full' },
  ports: { zone: 'side', size: 'full' },
  planned_tasks: { zone: 'side', size: 'full' },
  notifications: { zone: 'side', size: 'full' },
}

/**
 * Disposition par défaut = la « proposition de base » : l'ordre des blocs
 * historiques (#828, #832) est inchangé ; les deux widgets ajoutés avec la
 * personnalisation (tâches planifiées, notifications) ferment la colonne
 * latérale.
 */
export const DEFAULT_DASHBOARD_ORDER: Record<DashboardWidgetZone, readonly DashboardWidgetId[]> = {
  top: ['kpis'],
  main: ['attention', 'at_sea', 'upcoming_reservations', 'activity', 'boats'],
  side: ['ai_panel', 'spend', 'ports', 'planned_tasks', 'notifications'],
}

/** Fenêtre (jours) et plafond de lignes du widget « Tâches planifiées ». */
export const PLANNED_TASKS_DAYS = 30
export const PLANNED_TASKS_CAP = 5

export function isDashboardWidgetId(value: unknown): value is DashboardWidgetId {
  return DASHBOARD_WIDGET_IDS.includes(value as DashboardWidgetId)
}

export function isDashboardWidgetZone(value: unknown): value is DashboardWidgetZone {
  return DASHBOARD_WIDGET_ZONES.includes(value as DashboardWidgetZone)
}
