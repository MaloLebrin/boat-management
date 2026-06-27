<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'

const { t, locale } = useT()
const { pendingActions, isSyncing, cancelAction, drainQueue } = useOfflineQueue()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
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
    class="mx-6 mt-4 border border-amber-300 rounded-lg bg-amber-50 p-4 space-y-3"
  >
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-amber-900">
        {{ t('offline.queue.title', { count: String(pendingActions.length) }) }}
      </h3>
      <BaseButton variant="ghost" size="sm" :disabled="isSyncing" @click="drainQueue">
        {{ isSyncing ? t('offline.syncing') : t('offline.queue.syncNow') }}
      </BaseButton>
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
        <BaseButton
          variant="danger"
          size="sm"
          :disabled="isSyncing"
          :aria-label="t('offline.queue.cancelAriaLabel', { type: labelForType(action.type) })"
          @click="cancelAction(action.id!)"
        >
          {{ t('offline.queue.cancel') }}
        </BaseButton>
      </li>
    </ul>
  </div>
</template>
