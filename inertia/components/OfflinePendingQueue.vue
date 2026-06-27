<script setup lang="ts">
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'

const { t } = useT()
const { pendingActions, isSyncing, cancelAction, drainQueue } = useOfflineQueue()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function labelForType(type: string): string {
  const key = `offline.queue.type.${type}`
  const result = t(key)
  return result === key ? type : result
}
</script>

<template>
  <div
    v-if="pendingActions.length > 0"
    class="border border-amber-300 rounded-lg bg-amber-50 p-4 space-y-3"
  >
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-amber-900">
        {{ t('offline.queue.title', { count: String(pendingActions.length) }) }}
      </h3>
      <button
        type="button"
        :disabled="isSyncing"
        class="text-xs font-medium text-amber-700 hover:text-amber-900 underline disabled:opacity-50"
        @click="drainQueue"
      >
        {{ isSyncing ? t('offline.syncing') : t('offline.queue.syncNow') }}
      </button>
    </div>

    <ul class="space-y-2">
      <li
        v-for="action in pendingActions"
        :key="action.id"
        class="flex items-center justify-between gap-3 rounded-md bg-white border border-amber-200 px-3 py-2 text-sm"
      >
        <div class="min-w-0">
          <p class="font-medium text-fg truncate">{{ labelForType(action.type) }}</p>
          <p class="text-xs text-fg-muted">{{ formatDate(action.createdAt) }}</p>
        </div>
        <button
          type="button"
          :disabled="isSyncing"
          class="shrink-0 text-xs text-danger hover:text-danger/80 font-medium disabled:opacity-40"
          :aria-label="t('offline.queue.cancelAriaLabel', { type: labelForType(action.type) })"
          @click="cancelAction(action.id!)"
        >
          {{ t('offline.queue.cancel') }}
        </button>
      </li>
    </ul>
  </div>
</template>
