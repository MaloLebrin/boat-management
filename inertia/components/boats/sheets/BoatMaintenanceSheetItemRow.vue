<script setup lang="ts">
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { MaintenanceSheetItemRow } from '~/types/boat_show'

const { t } = useT()

defineProps<{
  item: MaintenanceSheetItemRow
  canManage: boolean
  /** État affiché : optimiste hors-ligne, sinon la prop serveur (#490). */
  displayDone: boolean
  notesValue: string
}>()

const emit = defineEmits<{
  'toggle': []
  'update:notes': [value: string]
  'notes-blur': []
}>()
</script>

<template>
  <div
    :class="[
      'rounded-lg border p-3 transition-colors',
      displayDone ? 'border-border bg-surface-muted/30' : 'border-border bg-surface',
    ]"
  >
    <div class="flex items-start gap-3">
      <!-- Checkbox -->
      <button
        v-if="canManage"
        type="button"
        :class="[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
          displayDone
            ? 'border-brand bg-brand-soft text-brand'
            : 'border-border hover:border-brand',
        ]"
        @click="emit('toggle')"
      >
        <svg
          v-if="displayDone"
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
          displayDone ? 'border-brand bg-brand-soft text-brand' : 'border-border',
        ]"
      >
        <svg
          v-if="displayDone"
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
        <p :class="['text-sm font-medium', displayDone ? 'text-fg-muted line-through' : 'text-fg']">
          {{ item.label }}
        </p>

        <!-- Notes input -->
        <BaseTextarea
          v-if="canManage"
          :model-value="notesValue"
          :placeholder="t('boats.sheets.itemNotesPlaceholder')"
          :rows="2"
          compact
          class="mt-2"
          @update:model-value="emit('update:notes', $event)"
          @focusout="emit('notes-blur')"
        />
        <p v-else-if="item.notes" class="mt-1 text-sm text-fg-muted">{{ item.notes }}</p>
      </div>
    </div>
  </div>
</template>
