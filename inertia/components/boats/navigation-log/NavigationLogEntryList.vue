<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import NavigationLogEntryEditForm from '~/components/boats/navigation-log/NavigationLogEntryEditForm.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { NavigationLogEntryRow } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  logId: number
  entries: NavigationLogEntryRow[]
  canEdit: boolean
}>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const editingEntryId = ref<number | null>(null)

function deleteEntry(entry: NavigationLogEntryRow) {
  if (!window.confirm(t('navigation_logs.entries.deleteConfirm'))) return
  router.delete(`/boats/${props.boatId}/navigation-logs/${props.logId}/entries/${entry.id}`, {
    preserveScroll: true,
  })
}

function formatCoords(entry: NavigationLogEntryRow): string | null {
  if (entry.latitude === null || entry.longitude === null) return null
  return `${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`
}
</script>

<template>
  <div v-if="entries.length > 0" class="space-y-2">
    <div
      v-for="entry in entries"
      :key="entry.id"
      class="rounded-md border border-border bg-surface-elevated px-4 py-3 text-sm"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 space-y-0.5">
          <p class="font-medium text-fg">{{ formatDateTime(entry.recordedAt) }}</p>
          <p class="text-xs text-fg-muted">
            <template v-if="entry.sogKn !== null && entry.sogKn > 0 && entry.cogDeg !== null">
              {{ t('navigation_logs.entries.cog') }} {{ entry.cogDeg }}° ·
              {{ t('navigation_logs.entries.sog') }} {{ entry.sogKn.toFixed(1) }}
              {{ t('navigation_logs.entries.knSuffix') }}
            </template>
            <template v-else-if="entry.sogKn !== null">
              {{ t('navigation_logs.entries.sogNearZero') }}
            </template>
            <template v-else>—</template>
            <span v-if="formatCoords(entry)" class="ml-2">· {{ formatCoords(entry) }}</span>
          </p>
          <p v-if="entry.sailConfig" class="text-xs text-fg-muted">
            {{ t('navigation_logs.entries.sailConfig') }} : {{ entry.sailConfig }}
          </p>
          <p v-if="entry.note" class="whitespace-pre-wrap text-xs text-fg-muted">
            {{ entry.note }}
          </p>
        </div>

        <div v-if="canEdit" class="flex shrink-0 items-center gap-2">
          <BaseButton
            type="button"
            variant="ghost"
            size="sm"
            @click="editingEntryId = editingEntryId === entry.id ? null : entry.id"
          >
            {{ t('navigation_logs.entries.editBtn') }}
          </BaseButton>
          <BaseButton type="button" variant="ghost" size="sm" @click="deleteEntry(entry)">
            {{ t('navigation_logs.form.delete') }}
          </BaseButton>
        </div>
      </div>

      <div v-if="editingEntryId === entry.id" class="mt-3 border-t border-border pt-3">
        <NavigationLogEntryEditForm
          :boat-id="boatId"
          :log-id="logId"
          :entry="entry"
          @close="editingEntryId = null"
        />
      </div>
    </div>
  </div>
  <p v-else class="text-sm text-fg-muted">{{ t('navigation_logs.entries.empty') }}</p>
</template>
