import type { Data } from '@generated/data'
import { router, usePage } from '@inertiajs/vue3'
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useT } from '~/composables/use_t'

/**
 * Durée nominale d'un toast de flash, décomptée par vue-sonner.
 */
export const FLASH_TOAST_DURATION_MS = 4_000

/**
 * Durée de vie maximale d'un toast, quel que soit son état (issue #467).
 *
 * vue-sonner met son minuteur en pause tant que le toaster est survolé
 * (`expanded`) ou « en cours d'interaction » (`interacting`, posé au
 * `pointerdown`). Sur la fiche bateau, le toaster est en `top-center` — pile
 * au-dessus de la barre d'onglets : le pointeur ne quitte jamais vraiment la
 * zone, et `interacting` ne retombe même pas si le `pointerup` a lieu ailleurs.
 * Le minuteur restait donc en pause indéfiniment et « Tâche marquée comme
 * terminée. » survivait à plusieurs changements d'onglet (> 45 s), la seule
 * disparition possible étant le `toast.dismiss()` au changement d'URL.
 *
 * Ce garde-fou passe outre la pause : au bout de ce délai le toast est retiré
 * dans tous les cas. Il reste assez large pour laisser le temps de lire, voire
 * de cliquer l'action « Voir les offres » d'un toast d'erreur.
 */
export const FLASH_TOAST_MAX_LIFETIME_MS = 10_000

/**
 * Traduit les messages flash partagés par le middleware Inertia en toasts.
 * Mutualisé entre les layouts `default` et `auth`, qui portent chacun un
 * `<Toaster>`.
 */
export function useFlashToasts() {
  const page = usePage<Data.SharedProps>()
  const { t } = useT()

  const safetyTimers = new Set<ReturnType<typeof setTimeout>>()

  function clearSafetyTimers() {
    for (const timer of safetyTimers) clearTimeout(timer)
    safetyTimers.clear()
  }

  function scheduleHardDismiss(id: string | number) {
    const timer = setTimeout(() => {
      safetyTimers.delete(timer)
      toast.dismiss(id)
    }, FLASH_TOAST_MAX_LIFETIME_MS)
    safetyTimers.add(timer)
  }

  /**
   * Retire tous les toasts et annule les garde-fous en attente — appelé au
   * changement d'URL par le layout `default`.
   */
  function dismissAll() {
    clearSafetyTimers()
    toast.dismiss()
  }

  function showFlashToasts(flashMessages: Data.SharedProps['flash']) {
    if (flashMessages.error) {
      // Upsell quota (issue #418) : le toast d'erreur porte une action « Voir les
      // offres » vers la page de facturation quand le backend l'a renseignée.
      const errorAction = flashMessages.errorAction
      scheduleHardDismiss(
        toast.error(flashMessages.error, {
          duration: FLASH_TOAST_DURATION_MS,
          action: errorAction
            ? {
                label: t('common.viewPlans'),
                onClick: () => router.visit(errorAction),
              }
            : undefined,
        })
      )
    }
    if (flashMessages.success) {
      scheduleHardDismiss(
        toast.success(flashMessages.success, { duration: FLASH_TOAST_DURATION_MS })
      )
    }
    if (flashMessages.info) {
      scheduleHardDismiss(toast.info(flashMessages.info, { duration: FLASH_TOAST_DURATION_MS }))
    }
  }

  watch(() => page.props.flash, showFlashToasts)

  // Le flash présent au premier rendu est joué au `mounted` du layout, et non
  // via `{ immediate: true }` : vue-sonner ne rejoue pas les toasts publiés
  // avant qu'un `<Toaster>` ne se soit abonné, et le `<Toaster>` est monté en
  // enfant — donc après l'exécution du `setup()`. Un message flash porté par le
  // tout premier chargement était sinon perdu.
  onMounted(() => showFlashToasts(page.props.flash))

  onBeforeUnmount(clearSafetyTimers)

  return { dismissAll }
}
