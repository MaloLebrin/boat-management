import { router } from '@inertiajs/vue3'

/** Options de visite acceptées par `router.delete`, dérivées de sa signature. */
export type DeleteVisitOptions = Parameters<typeof router.delete>[1]

/**
 * Visite de suppression, options transmises **telles quelles** : absentes, la
 * requête part à un seul argument — la signature qu'attendent les specs des
 * écrans qui n'en passent pas (cartes de port, page port).
 *
 * Trois porteurs de confirmation appellent la même chose et recopiaient ce
 * même `if` : la garde native (`utils/native_dialog`), la confirmation de
 * ligne (`useRowDeleteConfirmation`) et celle d'entité
 * (`useDeleteConfirmation`).
 */
export function deleteVisit(url: string, options?: DeleteVisitOptions): void {
  if (options === undefined) {
    router.delete(url)
    return
  }
  router.delete(url, options)
}
