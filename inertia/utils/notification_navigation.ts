import { router } from '@inertiajs/vue3'
import { isSafeInternalPath } from '#shared/helpers/safe_path'
import type { NotificationForFront } from '#shared/types/notification'

/**
 * Clic sur une notification (panneau de la cloche, widget du tableau de
 * bord) : marquer lue si besoin, puis naviguer vers `actionUrl` **seulement**
 * si c'est un chemin interne (#780) — ne rien faire vaut mieux qu'ouvrir une
 * redirection ouverte. La notification est marquée lue dans les deux cas.
 */
export function openNotification(notif: NotificationForFront): void {
  const target = isSafeInternalPath(notif.actionUrl) ? notif.actionUrl : null

  if (!notif.isRead) {
    router.patch(
      `/notifications/${notif.id}/read`,
      {},
      {
        preserveScroll: true,
        onSuccess: () => {
          if (target) router.visit(target)
        },
      }
    )
  } else if (target) {
    router.visit(target)
  }
}
