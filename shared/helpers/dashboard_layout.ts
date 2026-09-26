import {
  DASHBOARD_REORDERABLE_ZONES,
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_ZONES,
  DEFAULT_DASHBOARD_ORDER,
  DEFAULT_HIDDEN_WIDGETS,
  type DashboardWidgetId,
  type DashboardWidgetZone,
} from '#shared/constants/dashboard_widgets'
import type {
  DashboardWidgetAvailability,
  ResolvedDashboardLayout,
  StoredDashboardLayout,
  UpdateDashboardLayoutPayload,
} from '#shared/types/dashboard_layout'

/** Disponibilité « tout accessible » — pratique côté front et dans les tests. */
export const ALL_WIDGETS_AVAILABLE: DashboardWidgetAvailability = Object.fromEntries(
  DASHBOARD_WIDGET_IDS.map((id) => [id, true])
) as DashboardWidgetAvailability

/**
 * Ordre d'une zone à partir d'une liste stockée : on garde les ids connus,
 * de la bonne zone et disponibles, dans l'ordre stocké, puis on réinsère
 * chaque id du défaut absent juste après son voisin précédent du défaut déjà
 * présent (ou en tête s'il n'en a aucun). Un widget livré après la
 * personnalisation prend ainsi sa place « naturelle ».
 */
function resolveZoneOrder(
  zone: DashboardWidgetZone,
  stored: readonly DashboardWidgetId[] | null,
  availability: DashboardWidgetAvailability
): DashboardWidgetId[] {
  const defaults = DEFAULT_DASHBOARD_ORDER[zone].filter((id) => availability[id])
  if (stored === null || !DASHBOARD_REORDERABLE_ZONES.includes(zone)) return [...defaults]

  const seen = new Set<DashboardWidgetId>()
  const ordered: DashboardWidgetId[] = []
  for (const id of stored) {
    if (!(id in DASHBOARD_WIDGETS)) continue
    if (DASHBOARD_WIDGETS[id].zone !== zone || !availability[id] || seen.has(id)) continue
    seen.add(id)
    ordered.push(id)
  }

  defaults.forEach((id, index) => {
    if (seen.has(id)) return
    let insertAt = 0
    for (let i = index - 1; i >= 0; i--) {
      const previousIndex = ordered.indexOf(defaults[i])
      if (previousIndex !== -1) {
        insertAt = previousIndex + 1
        break
      }
    }
    ordered.splice(insertAt, 0, id)
    seen.add(id)
  })

  return ordered
}

/**
 * Résout la disposition à afficher : défaut si rien n'est stocké (les widgets
 * `defaultHidden` masqués), sinon la disposition stockée assainie (ids
 * inconnus, mal zonés ou indisponibles ignorés, nouveaux widgets réinsérés).
 * Utilisée par le serveur (ne calculer que les données des widgets visibles)
 * **et** par la page.
 */
export function resolveDashboardLayout(
  stored: StoredDashboardLayout | null,
  availability: DashboardWidgetAvailability
): ResolvedDashboardLayout {
  const order = Object.fromEntries(
    DASHBOARD_WIDGET_ZONES.map((zone) => [
      zone,
      resolveZoneOrder(zone, stored && zone !== 'top' ? stored.order[zone] : null, availability),
    ])
  ) as Record<DashboardWidgetZone, DashboardWidgetId[]>

  // Un widget `defaultHidden` livré après la personnalisation (absent de
  // l'ordre stocké) reste masqué : il rejoint la galerie, pas la page.
  const knownStored = stored
    ? new Set<DashboardWidgetId>([...stored.order.main, ...stored.order.side])
    : null
  const hidden = Array.from(
    new Set<DashboardWidgetId>([
      ...(stored ? stored.hidden : []),
      ...DEFAULT_HIDDEN_WIDGETS.filter((id) => knownStored === null || !knownStored.has(id)),
    ])
  ).filter((id) => id in DASHBOARD_WIDGETS && availability[id])

  return { order, hidden, isCustomized: stored !== null }
}

/** Widgets rendus dans une zone : l'ordre résolu moins les masqués. */
export function visibleWidgets(
  layout: ResolvedDashboardLayout,
  zone: DashboardWidgetZone
): DashboardWidgetId[] {
  const hidden = new Set(layout.hidden)
  return layout.order[zone].filter((id) => !hidden.has(id))
}

/** Ensemble de tous les widgets visibles, toutes zones confondues. */
export function visibleWidgetSet(layout: ResolvedDashboardLayout): Set<DashboardWidgetId> {
  return new Set(DASHBOARD_WIDGET_ZONES.flatMap((zone) => visibleWidgets(layout, zone)))
}

/**
 * Regroupe une colonne en lignes : un widget `full` occupe sa ligne, deux
 * widgets `half` **consécutifs** se partagent la leur (rendue en deux
 * colonnes dès `md`). Reproduit génériquement la grille « aujourd'hui »
 * (En mer + Prochains départs) quel que soit l'ordre choisi.
 */
export function groupDashboardWidgets(ids: readonly DashboardWidgetId[]): DashboardWidgetId[][] {
  const rows: DashboardWidgetId[][] = []
  for (const id of ids) {
    const last = rows[rows.length - 1]
    if (
      DASHBOARD_WIDGETS[id].size === 'half' &&
      last !== undefined &&
      last.length === 1 &&
      DASHBOARD_WIDGETS[last[0]].size === 'half'
    ) {
      last.push(id)
      continue
    }
    rows.push([id])
  }
  return rows
}

/**
 * Assainit le corps d'un `PUT /dashboard/layout` avant stockage : passe par
 * le résolveur (mêmes règles qu'à l'affichage), puis ne conserve que les
 * zones réordonnables et les masqués effectivement disponibles.
 */
export function normalizeDashboardLayoutPayload(
  payload: UpdateDashboardLayoutPayload,
  availability: DashboardWidgetAvailability
): StoredDashboardLayout {
  const resolved = resolveDashboardLayout(
    { version: 1, order: payload.order, hidden: payload.hidden },
    availability
  )
  return {
    version: 1,
    order: { main: resolved.order.main, side: resolved.order.side },
    hidden: resolved.hidden,
  }
}
