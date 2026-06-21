import { usePage } from '@inertiajs/vue3'
import { computed, onMounted, ref, watch } from 'vue'
import type { NotificationForFront, NotificationsSharedProps } from '#shared/types/notification'

// Module-level singleton state — survives Inertia page navigations
const storedUnreadCount = ref(0)
const storedRecent = ref<NotificationForFront[]>([])

let subscribedUserId: number | null = null
let isSubscribing = false

export function useNotifications() {
  const page = usePage()

  const sharedProps = computed(() => {
    const props = page.props as Record<string, unknown>
    return (
      (props.notifications as NotificationsSharedProps | undefined) ?? {
        unreadCount: 0,
        recent: [],
      }
    )
  })

  // Keep reactive state in sync with Inertia shared props on page navigations
  watch(
    sharedProps,
    (val) => {
      storedUnreadCount.value = val.unreadCount
      storedRecent.value = val.recent
    },
    { immediate: true }
  )

  onMounted(async () => {
    const user = (page.props as Record<string, unknown>).user as { id: number } | undefined
    if (!user?.id || subscribedUserId === user.id || isSubscribing) return

    isSubscribing = true
    subscribedUserId = user.id

    try {
      const { Transmit } = await import('@adonisjs/transmit-client')
      const transmitClient = new Transmit({ baseUrl: window.location.origin })

      const subscription = transmitClient.subscription(`notifications/${user.id}`)
      await subscription.create()

      subscription.onMessage<{ notification: NotificationForFront }>((data) => {
        storedUnreadCount.value++
        storedRecent.value = [data.notification, ...storedRecent.value].slice(0, 5)
      })
    } catch {
      subscribedUserId = null
    } finally {
      isSubscribing = false
    }
  })

  return {
    unreadCount: computed(() => storedUnreadCount.value),
    recentNotifications: computed<NotificationForFront[]>(() => storedRecent.value),
    hasUnread: computed(() => storedUnreadCount.value > 0),
  }
}
