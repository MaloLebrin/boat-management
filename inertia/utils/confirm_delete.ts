import { router } from '@inertiajs/vue3'

/** Options de visite acceptées par `router.delete`, dérivées de sa signature. */
type DeleteVisitOptions = Parameters<typeof router.delete>[1]

/**
 * Garde de confirmation native, partagée par les dix-huit suppressions gardées
 * de l'app (vague 3.5). Deux choses valent d'être au même endroit : `window.`
 * explicite — un `confirm()` nu lève côté SSR, et la moitié des sites
 * l'écrivait ainsi — et le seul endroit à toucher le jour où ces dialogues
 * passeront à `BaseConfirmModal` comme les écrans qui confirment déjà dans
 * l'app.
 *
 * Hors navigateur, rien n'est confirmé : une action destructrice ne part
 * jamais faute de dialogue.
 */
export function confirmed(message: string): boolean {
  if (typeof window === 'undefined') return false
  return window.confirm(message)
}

/**
 * Confirme, puis supprime. Les options de visite sont transmises **telles
 * quelles** : les sites qui passaient `{ preserveScroll: true }` le gardent,
 * les deux cartes de port qui n'en passaient aucune gardent leur signature à
 * un seul argument.
 */
export function confirmDelete(message: string, url: string, options?: DeleteVisitOptions): void {
  if (!confirmed(message)) return
  if (options === undefined) {
    router.delete(url)
    return
  }
  router.delete(url, options)
}
