<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref, watch } from 'vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type {
  BoatShowDetail,
  MaintenanceSheetItemRow,
  MaintenanceSheetRow,
} from '~/types/boat_show'

const { t } = useT()

const props = defineProps<{
  boat: BoatShowDetail
  sheet: MaintenanceSheetRow
  items: MaintenanceSheetItemRow[]
  canManage: boolean
}>()

const editingNotes = ref<Record<number, string>>({})
const debounceTimers = ref<Record<number, ReturnType<typeof setTimeout>>>({})

watch(
  () => props.items,
  (newItems) => {
    for (const item of newItems) {
      if (editingNotes.value[item.id] === undefined) {
        editingNotes.value[item.id] = item.notes ?? ''
      }
    }
  },
  { immediate: true }
)

function toggleItemDone(item: MaintenanceSheetItemRow) {
  if (!props.canManage) return
  router.put(
    `/boats/${props.boat.id}/maintenance-sheets/${props.sheet.id}/items/${item.id}`,
    { isDone: !item.isDone, notes: item.notes ?? '' },
    { preserveScroll: true }
  )
}

function updateItemNotes(item: MaintenanceSheetItemRow, newNotes: string) {
  if (!props.canManage) return
  editingNotes.value[item.id] = newNotes
  if (debounceTimers.value[item.id]) clearTimeout(debounceTimers.value[item.id])
  debounceTimers.value[item.id] = setTimeout(() => {
    router.put(
      `/boats/${props.boat.id}/maintenance-sheets/${props.sheet.id}/items/${item.id}`,
      { isDone: item.isDone, notes: newNotes },
      { preserveScroll: true }
    )
  }, 600)
}

function handleNotesBlur(item: MaintenanceSheetItemRow) {
  if (debounceTimers.value[item.id]) clearTimeout(debounceTimers.value[item.id])
  const newNotes = editingNotes.value[item.id] ?? ''
  if (newNotes !== (item.notes ?? '')) {
    router.put(
      `/boats/${props.boat.id}/maintenance-sheets/${props.sheet.id}/items/${item.id}`,
      { isDone: item.isDone, notes: newNotes },
      { preserveScroll: true }
    )
  }
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="item in items"
      :key="item.id"
      :class="[
        'rounded-lg border p-3 transition-colors',
        item.isDone ? 'border-border bg-surface-muted/30' : 'border-border bg-surface',
      ]"
    >
      <div class="flex items-start gap-3">
        <!-- Checkbox -->
        <button
          v-if="canManage"
          type="button"
          :class="[
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            item.isDone
              ? 'border-mint-500 bg-mint-500 text-white'
              : 'border-border hover:border-brand',
          ]"
          @click="toggleItemDone(item)"
        >
          <svg
            v-if="item.isDone"
            class="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </button>
        <div
          v-else
          :class="[
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
            item.isDone ? 'border-mint-500 bg-mint-500 text-white' : 'border-border',
          ]"
        >
          <svg
            v-if="item.isDone"
            class="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <!-- Label and notes -->
        <div class="flex-1 min-w-0">
          <p
            :class="['text-sm font-medium', item.isDone ? 'text-fg-muted line-through' : 'text-fg']"
          >
            {{ item.label }}
          </p>

          <!-- Notes input -->
          <BaseTextarea
            v-if="canManage"
            :model-value="editingNotes[item.id] ?? ''"
            :placeholder="t('boats.sheets.itemNotesPlaceholder')"
            :rows="2"
            class="mt-2"
            @update:model-value="updateItemNotes(item, $event)"
            @focusout="handleNotesBlur(item)"
          />
          <p v-else-if="item.notes" class="mt-1 text-sm text-fg-muted">{{ item.notes }}</p>
        </div>
      </div>
    </div>

    <p v-if="items.length === 0" class="text-sm text-fg-muted text-center py-4">
      {{ t('boats.sheets.noItems') }}
    </p>
  </div>
</template>
