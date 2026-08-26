<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { onBeforeUnmount, ref, watch } from 'vue'
import BoatMaintenanceSheetItemRow from '~/components/boats/sheets/BoatMaintenanceSheetItemRow.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'
import type {
  BoatShowDetail,
  MaintenanceSheetItemRow as SheetItemRow,
  MaintenanceSheetRow,
} from '~/types/boat_show'

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const props = defineProps<{
  boat: BoatShowDetail
  sheet: MaintenanceSheetRow
  items: SheetItemRow[]
  canManage: boolean
}>()

const editingNotes = ref<Record<number, string>>({})
const debounceTimers = ref<Record<number, ReturnType<typeof setTimeout>>>({})
// Hors-ligne, `item.isDone` (props Inertia) ne bouge pas : sans état optimiste
// l'utilisateur reclique et empile des actions contradictoires (#490)
const optimisticDone = ref<Record<number, boolean>>({})

watch(
  () => props.items,
  (newItems) => {
    for (const item of newItems) {
      if (editingNotes.value[item.id] === undefined) {
        editingNotes.value[item.id] = item.notes ?? ''
      }
      // Réconciliation : dès que le serveur reflète l'état optimiste, la prop
      // redevient la source de vérité
      if (optimisticDone.value[item.id] === item.isDone) {
        delete optimisticDone.value[item.id]
      }
    }
  },
  { immediate: true }
)

function displayDone(item: SheetItemRow): boolean {
  return optimisticDone.value[item.id] ?? item.isDone
}

function itemUrl(item: SheetItemRow): string {
  return `/boats/${props.boat.id}/maintenance-sheets/${props.sheet.id}/items/${item.id}`
}

function pushUpdate(item: SheetItemRow, isDone: boolean, notes: string) {
  if (!isOnline.value) {
    // `_expectedUpdatedAt` : le rejeu refuse d'écraser un item modifié entre-temps ;
    // `dedupeKey` : deux mises à jour du même item fusionnent en une seule action
    enqueue({
      type: 'update-sheet-item',
      url: itemUrl(item),
      method: 'put',
      payload: {
        isDone,
        notes,
        ...(item.updatedAt ? { _expectedUpdatedAt: item.updatedAt } : {}),
      },
      dedupeKey: `update-sheet-item:${itemUrl(item)}`,
    })
    return
  }
  router.put(itemUrl(item), { isDone, notes }, { preserveScroll: true })
}

function toggleItemDone(item: SheetItemRow) {
  if (!props.canManage) return
  const nextDone = !displayDone(item)
  if (!isOnline.value) optimisticDone.value[item.id] = nextDone
  pushUpdate(item, nextDone, editingNotes.value[item.id] ?? item.notes ?? '')
}

function updateItemNotes(item: SheetItemRow, newNotes: string) {
  if (!props.canManage) return
  editingNotes.value[item.id] = newNotes
  if (debounceTimers.value[item.id]) clearTimeout(debounceTimers.value[item.id])
  // Hors-ligne : pas de debounce — la dédup fusionne les frappes successives,
  // et rien n'est perdu si le composant est démonté (#490)
  if (!isOnline.value) {
    pushUpdate(item, displayDone(item), newNotes)
    return
  }
  debounceTimers.value[item.id] = setTimeout(() => {
    delete debounceTimers.value[item.id]
    pushUpdate(item, displayDone(item), newNotes)
  }, 600)
}

function handleNotesBlur(item: SheetItemRow) {
  if (debounceTimers.value[item.id]) {
    clearTimeout(debounceTimers.value[item.id])
    delete debounceTimers.value[item.id]
  }
  const newNotes = editingNotes.value[item.id] ?? ''
  if (newNotes !== (item.notes ?? '')) {
    pushUpdate(item, displayDone(item), newNotes)
  }
}

onBeforeUnmount(() => {
  // Un debounce encore armé au démontage serait perdu : on le vide tout de suite
  for (const item of props.items) {
    if (debounceTimers.value[item.id]) {
      clearTimeout(debounceTimers.value[item.id])
      delete debounceTimers.value[item.id]
      pushUpdate(item, displayDone(item), editingNotes.value[item.id] ?? '')
    }
  }
})
</script>

<template>
  <div class="space-y-3">
    <BoatMaintenanceSheetItemRow
      v-for="item in items"
      :key="item.id"
      :item="item"
      :can-manage="canManage"
      :display-done="displayDone(item)"
      :notes-value="editingNotes[item.id] ?? ''"
      @toggle="toggleItemDone(item)"
      @update:notes="updateItemNotes(item, $event)"
      @notes-blur="handleNotesBlur(item)"
    />

    <p v-if="items.length === 0" class="text-sm text-fg-muted text-center py-4">
      {{ t('boats.sheets.noItems') }}
    </p>
  </div>
</template>
