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

  /**
   * Pastille de sévérité : palettes de marque (elles basculent en thème
   * sombre), alignées sur les variantes de `BaseBadge` — la palette Tailwind
   * par défaut restait figée en sombre (#416).
   */
  function getSeverityClasses(severity: NotificationSeverity): string {
    switch (severity) {
      case 'info':
        return 'bg-sky-100 text-sky-800'
      case 'success':
        return 'bg-mint-100 text-mint-700'
      case 'warning':
        return 'bg-peach-100 text-peach-800'
      case 'error':
        return 'bg-coral-100 text-coral-700'
      default:
        return 'bg-lilac-100 text-lilac-800'
    }
  }

  return { formatRelativeTime, getSeverityClasses }
}
