import { computed, nextTick, ref, watch } from 'vue'
import { useT } from '~/composables/use_t'
import type { BoatDocumentRow, BoatIncidentRow, MaintenanceTaskRow } from '~/types/boat_show'

export type BoatShowTabKey =
  | 'overview'
  | 'specs'
  | 'pricing'
  | 'equipment'
  | 'equipmentActions'
  | 'history'
  | 'tasks'
  | 'documents'
  | 'sheets'
  | 'admin-docs'
  | 'navigation-logs'
  | 'fuel'
  | 'incidents'
  | 'position'

export type BoatShowGroupKey = 'overview' | 'equipment' | 'maintenance' | 'navigation' | 'documents'

type TabItem = { key: BoatShowTabKey; label: string; badge?: string }
type Group = { key: BoatShowGroupKey; label: string; tabs: TabItem[] }

/**
 * Regroupe les 9 anciens onglets de la fiche bateau + la page navigation en 5
 * groupes (#365). Le paramètre `?tab=` continue de référencer directement
 * l'onglet feuille (ex: `tasks`), le groupe actif en étant déduit.
 */
export function useBoatShowTabs(input: {
  maintenanceTasks: () => MaintenanceTaskRow[]
  boatDocuments: () => BoatDocumentRow[]
  incidents: () => BoatIncidentRow[]
  pricingEnabled: () => boolean
}) {
  const { t } = useT()

  const openTasks = computed(() =>
    input.maintenanceTasks().filter((task) => task.status === 'open')
  )

  const expiringDocCount = computed(
    () =>
      input.boatDocuments().filter((d) => d.status === 'expiring_soon' || d.status === 'expired')
        .length
  )

  const openIncidents = computed(() =>
    input.incidents().filter((i) => i.status === 'open' || i.status === 'in_progress')
  )

  const groups = computed<Group[]>(() => [
    {
      key: 'overview',
      label: t('boats.show.tabs.overview'),
      tabs: [{ key: 'overview', label: t('boats.show.tabs.overview') }],
    },
    {
      key: 'equipment',
      label: t('boats.show.groups.equipment'),
      tabs: [
        { key: 'equipment', label: t('boats.show.tabs.equipment') },
        { key: 'specs', label: t('boats.show.tabs.specs') },
        ...(input.pricingEnabled()
          ? [{ key: 'pricing' as const, label: t('boats.show.tabs.pricing') }]
          : []),
      ],
    },
    {
      key: 'maintenance',
      label: t('boats.show.groups.maintenance'),
      tabs: [
        { key: 'history', label: t('boats.show.tabs.history') },
        {
          key: 'tasks',
          label: t('boats.show.tabs.tasks'),
          badge: openTasks.value.length > 0 ? String(openTasks.value.length) : undefined,
        },
        { key: 'sheets', label: t('boats.show.tabs.sheets') },
        { key: 'equipmentActions', label: t('boats.show.tabs.equipmentActions') },
      ],
    },
    {
      key: 'navigation',
      label: t('boats.show.groups.navigation'),
      tabs: [
        { key: 'navigation-logs', label: t('navigation_logs.tab') },
        { key: 'fuel', label: t('fuel_logs.tab') },
        {
          key: 'incidents',
          label: t('incidents.tab'),
          badge: openIncidents.value.length > 0 ? String(openIncidents.value.length) : undefined,
        },
        { key: 'position', label: t('boats.show.position.tab') },
      ],
    },
    {
      key: 'documents',
      label: t('boats.show.groups.documents'),
      tabs: [
        { key: 'documents', label: t('boats.show.tabs.documents') },
        {
          key: 'admin-docs',
          label: t('boats.show.tabs.adminDocs'),
          badge: expiringDocCount.value > 0 ? String(expiringDocCount.value) : undefined,
        },
      ],
    },
  ])

  const VALID_TABS = computed<BoatShowTabKey[]>(() =>
    groups.value.flatMap((g) => g.tabs.map((tabItem) => tabItem.key))
  )

  function groupOf(key: BoatShowTabKey): BoatShowGroupKey {
    return (
      groups.value.find((g) => g.tabs.some((tabItem) => tabItem.key === key))?.key ?? 'overview'
    )
  }

  function getInitialTab(): BoatShowTabKey {
    if (typeof window === 'undefined') return 'overview'
    const fromUrl = new URLSearchParams(window.location.search).get('tab') as BoatShowTabKey | null
    return fromUrl && VALID_TABS.value.includes(fromUrl) ? fromUrl : 'overview'
  }

  const tab = ref<BoatShowTabKey>(getInitialTab())

  // Mémorise le dernier sous-onglet visité par groupe, pour y revenir en
  // cliquant à nouveau sur le groupe dans la barre principale.
  const lastTabByGroup = ref<Partial<Record<BoatShowGroupKey, BoatShowTabKey>>>({
    [groupOf(tab.value)]: tab.value,
  })

  const activeGroupKey = computed<BoatShowGroupKey>(() => groupOf(tab.value))

  const groupTabs = computed(() =>
    groups.value.map((g) => ({
      key: g.key,
      label: g.label,
      badge: g.tabs.map((tabItem) => tabItem.badge).find((b) => b !== undefined),
    }))
  )

  const activeGroupSubTabs = computed(
    () => groups.value.find((g) => g.key === activeGroupKey.value)?.tabs ?? []
  )

  watch(tab, (newTab) => {
    const url = new URL(window.location.href)
    if (newTab === 'overview') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', newTab)
    }
    lastTabByGroup.value[groupOf(newTab)] = newTab
    // On met à jour l'URL sans déclencher de requête Inertia
    window.history.replaceState(window.history.state, '', url.pathname + url.search)
  })

  // Un skeleton s'affiche immédiatement au clic, le temps que le navigateur
  // peigne la frame avant de monter le contenu (souvent lourd) du nouvel
  // onglet (#361).
  const isTabLoading = ref(false)

  function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()))
  }

  async function goToTab(key: BoatShowTabKey | string) {
    const nextTab = key as BoatShowTabKey
    if (nextTab === tab.value) return
    isTabLoading.value = true
    await nextTick()
    await nextFrame()
    tab.value = nextTab
    await nextTick()
    isTabLoading.value = false
  }

  async function goToGroup(key: BoatShowGroupKey | string) {
    const groupKey = key as BoatShowGroupKey
    if (groupKey === activeGroupKey.value) return
    const target =
      lastTabByGroup.value[groupKey] ?? groups.value.find((g) => g.key === groupKey)?.tabs[0]?.key
    if (target) await goToTab(target)
  }

  return {
    tab,
    activeGroupKey,
    groupTabs,
    activeGroupSubTabs,
    isTabLoading,
    openTasks,
    goToTab,
    goToGroup,
  }
}
