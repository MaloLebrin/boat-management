import { ref, type Ref } from 'vue'
import { deleteVisit, type DeleteVisitOptions } from '~/utils/delete_visit'

export interface UseDeleteConfirmationOptions {
  /** URL de suppression, calculée **au moment de confirmer**. */
  url: () => string
  /** Options de visite, transmises telles quelles ; absentes, la visite part à un seul argument. */
  visit?: DeleteVisitOptions
}

export interface DeleteConfirmation {
  /** À brancher sur le `:open` de `BaseConfirmModal`. */
  isOpen: Ref<boolean>
  /** Demande confirmation. */
  ask: () => void
  /** Referme sans supprimer — à brancher sur `@update:open`. */
  release: () => void
  /** Supprime, puis referme — à brancher sur `@confirm`. */
  confirm: () => void
}

/**
 * Suppression confirmée de **sa propre** entité : la page connaît déjà ce
 * qu'elle supprime par ses props, il n'y a pas de ligne à viser. C'est le
 * pendant de `useRowDeleteConfirmation` (#676) pour les trois écrans qui
 * tenaient chacun leur booléen d'ouverture — facture affichée, bateau édité,
 * port affiché.
 *
 * `BaseConfirmModal.confirm()` émet `confirm` **puis** `update:open: false` :
 * la modale se referme donc d'elle-même, et le `release()` fait ici garde
 * l'état du composable d'accord avec elle.
 */
export function useDeleteConfirmation(options: UseDeleteConfirmationOptions): DeleteConfirmation {
  const isOpen = ref(false)

  function ask() {
    isOpen.value = true
  }

  function release() {
    isOpen.value = false
  }

  function confirm() {
    deleteVisit(options.url(), options.visit)
    release()
  }

  return { isOpen, ask, release, confirm }
}
