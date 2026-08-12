import type { BoatShowTabKey } from '~/composables/use_boat_show_tabs'

/**
 * Les données d'onglet de la fiche bateau arrivent en deux groupes de props
 * différées (#463). Tant que le groupe dont dépend l'onglet actif n'est pas
 * arrivé, l'onglet affiche un skeleton au lieu de rien du tout.
 */
export type BoatShowDeferredGroup = 'maintenance' | 'navigation'

export interface BoatShowDeferredGroupsLoaded {
  maintenance: boolean
  navigation: boolean
}

const TAB_DEFERRED_GROUP: Record<BoatShowTabKey, BoatShowDeferredGroup | null> = {
  'overview': 'maintenance',
  'specs': null,
  'pricing': null,
  'equipment': null,
  'equipmentActions': 'maintenance',
  'history': 'maintenance',
  'tasks': 'maintenance',
  'documents': null,
  'sheets': 'maintenance',
  'admin-docs': 'maintenance',
  'navigation-logs': 'navigation',
  'fuel': 'navigation',
  'incidents': 'navigation',
  'position': null,
}

export function deferredGroupOfTab(tab: BoatShowTabKey): BoatShowDeferredGroup | null {
  return TAB_DEFERRED_GROUP[tab] ?? null
}

export function isTabDataReady(tab: BoatShowTabKey, loaded: BoatShowDeferredGroupsLoaded): boolean {
  const group = deferredGroupOfTab(tab)
  return group === null || loaded[group]
}
