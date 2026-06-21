<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BasePagination from '~/components/base/BasePagination.vue'
import { usePagination } from '~/composables/use_pagination'
import { useNotificationHelpers } from '~/composables/use_notification_helpers'
import { useT } from '~/composables/use_t'
import type { NotificationForFront, NotificationsPage } from '#shared/types/notification'

const { t } = useT()
const { formatRelativeTime, getSeverityClasses } = useNotificationHelpers()

const props = defineProps<{
  notifications: NotificationsPage
}>()

const { currentPage, lastPage, goToPage } = usePagination(
  () => props.notifications.meta,
  '/notifications'
)

const hasAnyUnread = computed(() => props.notifications.data.some((n) => !n.isRead))

function markAsRead(notif: NotificationForFront) {
  if (!notif.isRead) {
    router.patch(`/notifications/${notif.id}/read`, {}, { preserveScroll: true })
  }
}

function markAllRead() {
  router.patch('/notifications/read-all', {}, { preserveScroll: true })
}

function deleteNotification(notif: NotificationForFront) {
  router.delete(`/notifications/${notif.id}`, { preserveScroll: true })
}

function handleItemClick(notif: NotificationForFront) {
  if (!notif.isRead) {
    router.patch(
      `/notifications/${notif.id}/read`,
      {},
      {
        preserveScroll: true,
        onSuccess: () => {
          if (notif.actionUrl) router.visit(notif.actionUrl)
        },
      }
    )
  } else if (notif.actionUrl) {
    router.visit(notif.actionUrl)
  }
}
</script>

<template>
  <div class="w-full max-w-4xl mx-auto px-6 py-10 sm:px-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <BaseHeading level="1">{{ t('notifications.title') }}</BaseHeading>
      </div>
      <BaseButton v-if="hasAnyUnread" variant="secondary" size="sm" @click="markAllRead">
        {{ t('notifications.markAllRead') }}
      </BaseButton>
    </div>

    <div v-if="notifications.data.length > 0" class="space-y-4">
      <div
        v-for="notif in notifications.data"
        :key="notif.id"
        class="rounded-(--radius-card) border border-border bg-surface-elevated p-4 shadow-(--shadow-xs) transition-colors"
        :class="{ 'border-l-4 border-l-brand': !notif.isRead }"
      >
        <div class="flex items-start gap-4">
          <!-- Severity icon -->
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
            :class="getSeverityClasses(notif.severity)"
          >
            <!-- Info icon -->
            <svg
              v-if="notif.severity === 'info'"
              class="h-5 w-5"
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
              class="h-5 w-5"
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
              class="h-5 w-5"
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
              class="h-5 w-5"
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
            <button
              type="button"
              class="text-left"
              :class="{ 'cursor-pointer': notif.actionUrl }"
              @click="handleItemClick(notif)"
            >
              <p class="text-base font-medium text-fg" :class="{ 'font-semibold': !notif.isRead }">
                {{ notif.title }}
              </p>
              <p v-if="notif.body" class="mt-1 text-sm text-fg-muted">
                {{ notif.body }}
              </p>
            </button>
            <p class="mt-2 text-xs text-fg-subtle">
              {{ formatRelativeTime(notif.createdAt) }}
            </p>
          </div>

          <div class="flex flex-shrink-0 items-center gap-2">
            <button
              v-if="!notif.isRead"
              type="button"
              class="rounded-(--radius-control) px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 transition-colors"
              @click="markAsRead(notif)"
            >
              {{ t('notifications.markRead') }}
            </button>
            <button
              type="button"
              class="rounded-(--radius-control) px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              @click="deleteNotification(notif)"
            >
              {{ t('notifications.delete') }}
            </button>
          </div>
        </div>
      </div>

      <BasePagination
        v-if="lastPage > 1"
        :page="currentPage"
        :page-count="lastPage"
        @update:page="goToPage"
      />
    </div>

    <div
      v-else
      class="rounded-(--radius-card) border border-border bg-surface-elevated p-12 text-center shadow-(--shadow-xs)"
    >
      <div
        class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lilac-100 text-lilac-600"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </div>
      <p class="mt-4 font-display text-lg font-semibold text-fg">
        {{ t('notifications.empty') }}
      </p>
      <p class="mt-1 text-sm text-fg-muted">
        {{ t('notifications.emptyDescription') }}
      </p>
    </div>
  </div>
</template>
