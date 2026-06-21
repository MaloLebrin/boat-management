import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import type { NotificationForFront, NotificationsSharedProps } from '#shared/types/notification'

export function useNotifications() {
  const page = usePage()

  const notifications = computed(() => {
    const props = page.props as Record<string, unknown>
    return (
      (props.notifications as NotificationsSharedProps | undefined) ?? {
        unreadCount: 0,
        recent: [],
      }
    )
  })

  const unreadCount = computed(() => notifications.value.unreadCount)
  const recentNotifications = computed<NotificationForFront[]>(() => notifications.value.recent)
  const hasUnread = computed(() => unreadCount.value > 0)

  return { unreadCount, recentNotifications, hasUnread }
}
