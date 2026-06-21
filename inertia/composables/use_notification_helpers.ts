import type { NotificationSeverity } from '#shared/types/notification'
import { useT } from '~/composables/use_t'

export function useNotificationHelpers() {
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

  return { formatRelativeTime, getSeverityClasses }
}
