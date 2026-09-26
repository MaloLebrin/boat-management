<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useNotifications } from '~/composables/use_notifications'
import { useNotificationHelpers } from '~/composables/use_notification_helpers'
import { useT } from '~/composables/use_t'
import { openNotification } from '~/utils/notification_navigation'

/**
 * Widget « Notifications » : les dernières notifications non lues, déjà
 * portées par la prop partagée `notifications` (cloche du header) — aucune
 * requête supplémentaire, et le flux temps réel de la cloche l'alimente aussi.
 */
const { t } = useT()
const { recentNotifications, unreadCount } = useNotifications()
const { formatRelativeTime, getSeverityClasses } = useNotificationHelpers()
</script>

<template>
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">
          {{ t('dashboard.notifications.title') }}
          <span
            v-if="unreadCount > 0"
            class="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-on-brand"
            data-testid="dashboard-notifications-count"
          >
            {{ unreadCount }}
          </span>
        </h2>
        <Link
          href="/notifications"
          data-testid="dashboard-notifications-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.notifications.viewAll') }}
        </Link>
      </div>
    </template>

    <p v-if="recentNotifications.length === 0" class="text-sm text-fg-muted">
      {{ t('dashboard.notifications.empty') }}
    </p>

    <ul v-else class="-mx-2 space-y-1">
      <li v-for="notif in recentNotifications" :key="notif.id">
        <button
          type="button"
          data-testid="dashboard-notification-row"
          class="flex min-h-11 w-full items-start gap-3 rounded-(--radius-control) px-2 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          @click="openNotification(notif)"
        >
          <span
            class="mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
            :class="getSeverityClasses(notif.severity)"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-fg">{{ notif.title }}</span>
            <span v-if="notif.body" class="mt-0.5 line-clamp-2 block text-xs text-fg-muted">
              {{ notif.body }}
            </span>
            <span class="mt-0.5 block text-xs text-fg-subtle">
              {{ formatRelativeTime(notif.createdAt) }}
            </span>
          </span>
        </button>
      </li>
    </ul>
  </BaseCard>
</template>
