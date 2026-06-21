<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { useNotifications } from '~/composables/use_notifications'
import { useT } from '~/composables/use_t'
import type { NotificationForFront, NotificationSeverity } from '#shared/types/notification'

const emit = defineEmits<{
  close: []
}>()

const { recentNotifications, hasUnread } = useNotifications()
const { t } = useT()

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return t('notifications.time.justNow')
  if (diffMin < 60) return t('notifications.time.minutesAgo', { count: String(diffMin) })
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return t('notifications.time.hoursAgo', { count: String(diffH) })
  const diffD = Math.floor(diffH / 24)
  return t('notifications.time.daysAgo', { count: String(diffD) })
}

function handleItemClick(notif: NotificationForFront) {
  if (!notif.isRead) {
    router.patch(`/notifications/${notif.id}/read`, {}, { preserveScroll: true })
  }
  if (notif.actionUrl) {
    router.visit(notif.actionUrl)
  }
}

function markAllRead() {
  router.patch('/notifications/read-all', {}, { preserveScroll: true })
}

function handleViewAll() {
  emit('close')
  router.visit('/notifications')
}

function getSeverityClasses(severity: NotificationSeverity): string {
  switch (severity) {
    case 'info':
      return 'bg-blue-100 text-blue-600'
    case 'success':
      return 'bg-green-100 text-green-600'
    case 'warning':
      return 'bg-orange-100 text-orange-600'
    case 'error':
      return 'bg-red-100 text-red-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}
</script>

<template>
  <div
    class="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-surface-elevated shadow-lg"
  >
    <div class="flex items-center justify-between border-b border-border px-4 py-3">
      <h3 class="font-display text-sm font-semibold text-fg">
        {{ t('notifications.title') }}
      </h3>
      <button
        v-if="hasUnread"
        type="button"
        class="text-xs font-medium text-brand hover:text-brand-emphasis"
        @click="markAllRead"
      >
        {{ t('notifications.markAllRead') }}
      </button>
    </div>

    <div class="max-h-80 overflow-y-auto">
      <template v-if="recentNotifications.length > 0">
        <button
          v-for="notif in recentNotifications"
          :key="notif.id"
          type="button"
          class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
          :class="{ 'bg-brand/5': !notif.isRead }"
          @click="handleItemClick(notif)"
        >
          <!-- Severity icon -->
          <div
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            :class="getSeverityClasses(notif.severity)"
          >
            <!-- Info icon -->
            <svg
              v-if="notif.severity === 'info'"
              class="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <!-- Success icon -->
            <svg
              v-else-if="notif.severity === 'success'"
              class="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <!-- Warning icon -->
            <svg
              v-else-if="notif.severity === 'warning'"
              class="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <!-- Error icon -->
            <svg
              v-else-if="notif.severity === 'error'"
              class="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-fg" :class="{ 'font-semibold': !notif.isRead }">
              {{ notif.title }}
            </p>
            <p v-if="notif.body" class="mt-0.5 line-clamp-2 text-xs text-fg-muted">
              {{ notif.body }}
            </p>
            <p class="mt-1 text-xs text-fg-subtle">
              {{ formatRelativeTime(notif.createdAt) }}
            </p>
          </div>

          <div v-if="!notif.isRead" class="flex-shrink-0">
            <span class="block h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
          </div>
        </button>
      </template>

      <div v-else class="px-4 py-8 text-center">
        <p class="text-sm font-medium text-fg-muted">
          {{ t('notifications.empty') }}
        </p>
        <p class="mt-1 text-xs text-fg-subtle">
          {{ t('notifications.emptyDescription') }}
        </p>
      </div>
    </div>

    <div class="border-t border-border px-4 py-3">
      <button
        type="button"
        class="w-full text-center text-sm font-medium text-brand hover:text-brand-emphasis"
        @click="handleViewAll"
      >
        {{ t('notifications.viewAll') }}
      </button>
    </div>
  </div>
</template>
