import {
  isDashboardWidgetId,
  type DashboardWidgetId,
  type DashboardWidgetZone,
} from '#shared/constants/dashboard_widgets'

/**
 * Disposition telle que stockée dans `users.dashboard_layout` (jsonb).
 *
 * `null` en base = disposition par défaut. `hidden` est **explicite** (et non
 * « absent de `order` = masqué ») : un widget livré après la personnalisation
 * d'un utilisateur apparaît chez lui à sa position par défaut au lieu de
 * disparaître silencieusement.
 */
export interface StoredDashboardLayout {
  version: 1
  order: {
    main: DashboardWidgetId[]
    side: DashboardWidgetId[]
  }
  hidden: DashboardWidgetId[]
}

/** Widgets accessibles à l'utilisateur (rôle, plan, modules) — calculé côté serveur. */
export type DashboardWidgetAvailability = Record<DashboardWidgetId, boolean>

/**
 * Prop de page `layout` : pour chaque zone, **tous** les widgets disponibles
 * dans l'ordre résolu (masqués inclus, pour alimenter la modale de
 * personnalisation), plus la liste des masqués. La page rend
 * `order[zone]` moins `hidden`.
 */
export interface ResolvedDashboardLayout {
  order: Record<DashboardWidgetZone, DashboardWidgetId[]>
  hidden: DashboardWidgetId[]
  /** `true` dès qu'une disposition est stockée pour l'utilisateur. */
  isCustomized: boolean
}

/** Corps de `PUT /dashboard/layout`. */
export interface UpdateDashboardLayoutPayload {
  order: {
    main: DashboardWidgetId[]
    side: DashboardWidgetId[]
  }
  hidden: DashboardWidgetId[]
}

function isWidgetIdArray(value: unknown): value is DashboardWidgetId[] {
  return Array.isArray(value) && value.every(isDashboardWidgetId)
}

export function isStoredDashboardLayout(value: unknown): value is StoredDashboardLayout {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (candidate.version !== 1) return false
  if (typeof candidate.order !== 'object' || candidate.order === null) return false
  const order = candidate.order as Record<string, unknown>
  return (
    isWidgetIdArray(order.main) && isWidgetIdArray(order.side) && isWidgetIdArray(candidate.hidden)
  )
}
