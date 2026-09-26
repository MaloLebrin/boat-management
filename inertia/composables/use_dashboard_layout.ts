import { router } from '@inertiajs/vue3'
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import {
  DASHBOARD_REORDERABLE_ZONES,
  DASHBOARD_WIDGETS,
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
 * Mode édition en place du tableau de bord (façon écran d'accueil iOS) :
 * l'utilisateur retire, réajoute et réordonne les widgets **sur la page**,
 * dans un brouillon local appliqué immédiatement à l'affichage. « Terminé »
 * enregistre en une requête (`PUT`), « Annuler » revient à la disposition
 * servie, « Réinitialiser » restaure le défaut (`DELETE`). La page se
 * recharge par redirection Inertia et relit la prop `layout` — pas de
 * `preserveState`, sinon les colonnes garderaient l'ancien ordre.
 */
export function useDashboardLayout(layout: MaybeRefOrGetter<ResolvedDashboardLayout>) {
  const draftOrder = ref<DraftOrder>({ top: [], main: [], side: [] })
  const draftHidden = ref<DashboardWidgetId[]>([])
  const isEditing = ref(false)
  const isSaving = ref(false)

  /** Repart de la disposition servie par la page (à l'entrée en édition, à l'annulation). */
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

  /** Widgets rendus dans une zone pendant l'édition : le brouillon moins les retirés. */
  function visibleDraft(zone: DashboardWidgetZone): DashboardWidgetId[] {
    return draftOrder.value[zone].filter(isVisible)
  }

  function remove(id: DashboardWidgetId): void {
    if (!isVisible(id)) return
    draftHidden.value = [...draftHidden.value, id]
  }

  /**
   * Réaffiche un widget retiré. S'il n'est plus dans l'ordre du brouillon
   * (cas théorique), il rejoint la fin de sa colonne — l'utilisateur le
   * remonte ensuite avec les flèches.
   */
  function add(id: DashboardWidgetId): void {
    draftHidden.value = draftHidden.value.filter((hidden) => hidden !== id)
    const zone = DASHBOARD_WIDGETS[id].zone
    if (!draftOrder.value[zone].includes(id)) {
      draftOrder.value = { ...draftOrder.value, [zone]: [...draftOrder.value[zone], id] }
    }
  }

  /** Widgets retirés que l'utilisateur peut réajouter, par zone (pour la galerie). */
  const addable = computed<Record<DashboardWidgetZone, DashboardWidgetId[]>>(() => {
    const hidden = new Set(draftHidden.value)
    return Object.fromEntries(
      DASHBOARD_WIDGET_ZONES.map((zone) => [
        zone,
        draftOrder.value[zone].filter((id) => hidden.has(id)),
      ])
    ) as Record<DashboardWidgetZone, DashboardWidgetId[]>
  })

  const canAdd = computed(() => draftHidden.value.length > 0)

  function isReorderable(zone: DashboardWidgetZone): boolean {
    return DASHBOARD_REORDERABLE_ZONES.includes(zone)
  }

  /** Bornes calculées sur les widgets **visibles** : un widget retiré ne compte pas comme voisin. */
  function canMove(zone: DashboardWidgetZone, id: DashboardWidgetId, direction: -1 | 1): boolean {
    if (!isReorderable(zone)) return false
    const visible = visibleDraft(zone)
    const index = visible.indexOf(id)
    if (index === -1) return false
    const target = index + direction
    return target >= 0 && target < visible.length
  }

  /** Échange le widget avec son voisin visible dans la direction demandée. */
  function move(zone: DashboardWidgetZone, id: DashboardWidgetId, direction: -1 | 1): void {
    if (!canMove(zone, id, direction)) return
    const visible = visibleDraft(zone)
    const neighbour = visible[visible.indexOf(id) + direction]
    const list = [...draftOrder.value[zone]]
    const from = list.indexOf(id)
    const to = list.indexOf(neighbour)
    list[from] = neighbour
    list[to] = id
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
      onSuccess: () => {
        isEditing.value = false
        options.onSuccess?.()
      },
    })
  }

  function startEditing(): void {
    resetDraft()
    isEditing.value = true
  }

  function cancelEditing(): void {
    resetDraft()
    isEditing.value = false
  }

  /** « Terminé » : enregistre s'il y a un changement, sinon quitte simplement l'édition. */
  function finishEditing(): void {
    if (!isDirty.value) {
      isEditing.value = false
      return
    }
    save({
      onSuccess: () => {
        isEditing.value = false
      },
    })
  }

  resetDraft()

  return {
    draftOrder,
    draftHidden,
    isEditing,
    isSaving,
    isDirty,
    isCustomized,
    addable,
    canAdd,
    resetDraft,
    isVisible,
    visibleDraft,
    remove,
    add,
    isReorderable,
    canMove,
    move,
    save,
    reset,
    startEditing,
    cancelEditing,
    finishEditing,
  }
}
