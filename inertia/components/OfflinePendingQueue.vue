<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'

const { t } = useT()
const { formatTime } = useDateFormat()
const { pendingActions, isSyncing, cancelAction, drainQueue } = useOfflineQueue()

function labelForType(type: string): string {
  const key = `common.offline.queue.type.${type}`
  const result = t(key)
  return result === key ? type : result
}
</script>

<template>
  <div
    v-if="pendingActions.length > 0"
    class="mx-6 mt-4 border border-amber-300 rounded-lg bg-amber-50 p-4 space-y-3"
  >
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-amber-900">
        {{ t('common.offline.queue.title', { count: String(pendingActions.length) }) }}
      </h3>
      <BaseButton variant="ghost" size="sm" :disabled="isSyncing" @click="drainQueue">
        {{ isSyncing ? t('common.offline.syncing') : t('common.offline.queue.syncNow') }}
      </BaseButton>
    </div>

    <ul class="space-y-2">
      <li
        v-for="action in pendingActions"
        :key="action.id"
        class="flex items-center justify-between gap-3 rounded-md bg-surface-elevated border border-amber-200 px-3 py-2 text-sm"
      >
        <div class="min-w-0">
          <p class="font-medium text-fg truncate">{{ labelForType(action.type) }}</p>
          <p class="text-xs text-fg-muted">{{ formatTime(action.createdAt) }}</p>
        </div>
        <BaseButton
          variant="danger"
          size="sm"
          :disabled="isSyncing"
          :aria-label="
            t('common.offline.queue.cancelAriaLabel', { type: labelForType(action.type) })
          "
          @click="cancelAction(action.id!)"
        >
          {{ t('common.offline.queue.cancel') }}
        </BaseButton>
      </li>
    </ul>
  </div>
</template>
