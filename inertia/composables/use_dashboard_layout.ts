import { router } from '@inertiajs/vue3'
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import {
  DASHBOARD_REORDERABLE_ZONES,
  DASHBOARD_WIDGET_ZONES,
  type DashboardWidgetId,
  type DashboardWidgetZone,
} from '#shared/constants/dashboard_widgets'
import type {
  ResolvedDashboardLayout,
  UpdateDashboardLayoutPayload,
} from '#shared/types/dashboard_layout'

type DraftOrder = Record<DashboardWidgetZone, DashboardWidgetId[]>

const LAYOUT_PATH = '/dashboard/layout'

/**
 * Brouillon de la modale « Personnaliser » : l'utilisateur masque et
 * réordonne localement, puis enregistre en une fois (`PUT`) ou revient au
 * défaut (`DELETE`). La page se recharge par redirection Inertia et relit la
 * prop `layout` — pas de `preserveState`, sinon les colonnes garderaient
 * l'ancien ordre.
 */
export function useDashboardLayout(layout: MaybeRefOrGetter<ResolvedDashboardLayout>) {
  const draftOrder = ref<DraftOrder>(emptyOrder())
  const draftHidden = ref<DashboardWidgetId[]>([])
  const isSaving = ref(false)

  function emptyOrder(): DraftOrder {
    return { top: [], main: [], side: [] }
  }

  /** Repart de la disposition servie par la page (à l'ouverture, à l'annulation). */
  function resetDraft(): void {
    const current = toValue(layout)
    draftOrder.value = Object.fromEntries(
      DASHBOARD_WIDGET_ZONES.map((zone) => [zone, [...current.order[zone]]])
    ) as DraftOrder
    draftHidden.value = [...current.hidden]
  }

  function isVisible(id: DashboardWidgetId): boolean {
    return !draftHidden.value.includes(id)
  }

  function toggle(id: DashboardWidgetId): void {
    draftHidden.value = isVisible(id)
      ? [...draftHidden.value, id]
      : draftHidden.value.filter((hidden) => hidden !== id)
  }

  function isReorderable(zone: DashboardWidgetZone): boolean {
    return DASHBOARD_REORDERABLE_ZONES.includes(zone)
  }

  function canMove(zone: DashboardWidgetZone, id: DashboardWidgetId, direction: -1 | 1): boolean {
    if (!isReorderable(zone)) return false
    const index = draftOrder.value[zone].indexOf(id)
    if (index === -1) return false
    const target = index + direction
    return target >= 0 && target < draftOrder.value[zone].length
  }

  function move(zone: DashboardWidgetZone, id: DashboardWidgetId, direction: -1 | 1): void {
    if (!canMove(zone, id, direction)) return
    const list = [...draftOrder.value[zone]]
    const index = list.indexOf(id)
    const [moved] = list.splice(index, 1)
    list.splice(index + direction, 0, moved)
    draftOrder.value = { ...draftOrder.value, [zone]: list }
  }

  const payload = computed<UpdateDashboardLayoutPayload>(() => ({
    order: { main: [...draftOrder.value.main], side: [...draftOrder.value.side] },
    hidden: [...draftHidden.value],
  }))

  const isDirty = computed(() => {
    const current = toValue(layout)
    const sameList = (a: readonly DashboardWidgetId[], b: readonly DashboardWidgetId[]) =>
      a.length === b.length && a.every((id, i) => id === b[i])
    return (
      !sameList(draftOrder.value.main, current.order.main) ||
      !sameList(draftOrder.value.side, current.order.side) ||
      !sameList([...draftHidden.value].sort(), [...current.hidden].sort())
    )
  })

  const isCustomized = computed(() => toValue(layout).isCustomized)

  function save(options: { onSuccess?: () => void } = {}): void {
    // Objet littéral (et non l'interface) : `RequestPayload` exige une signature d'index.
    router.put(
      LAYOUT_PATH,
      { ...payload.value },
      {
        preserveScroll: true,
        onStart: () => {
          isSaving.value = true
        },
        onFinish: () => {
          isSaving.value = false
        },
        onSuccess: options.onSuccess,
      }
    )
  }

  function reset(options: { onSuccess?: () => void } = {}): void {
    router.delete(LAYOUT_PATH, {
      preserveScroll: true,
      onStart: () => {
        isSaving.value = true
      },
      onFinish: () => {
        isSaving.value = false
      },
      onSuccess: options.onSuccess,
    })
  }

  resetDraft()

  return {
    draftOrder,
    draftHidden,
    isSaving,
    isDirty,
    isCustomized,
    resetDraft,
    isVisible,
    toggle,
    isReorderable,
    canMove,
    move,
    save,
    reset,
  }
}
