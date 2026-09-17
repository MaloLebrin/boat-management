import { router } from '@inertiajs/vue3'
import { computed, ref, type ComputedRef, type Ref } from 'vue'

/** Options de visite acceptées par `router.delete`, dérivées de sa signature. */
type DeleteVisitOptions = Parameters<typeof router.delete>[1]

export interface UseRowDeleteConfirmationOptions<T> {
  /** URL de suppression de la ligne visée, calculée au moment de confirmer. */
  url: (target: T) => string
  /** Options de visite, transmises telles quelles ; absentes, la visite part à un seul argument. */
  visit?: DeleteVisitOptions
}

export interface RowDeleteConfirmation<T> {
  /** Ligne visée par la confirmation en cours — `null` quand il n'y en a pas. */
  target: Ref<T | null>
  /** À brancher sur le `:open` de `BaseConfirmModal`. */
  isOpen: ComputedRef<boolean>
  /** Demande confirmation pour cette ligne. */
  ask: (target: T) => void
  /** Referme sans supprimer — à brancher sur `@update:open`. */
  release: () => void
  /** Supprime la ligne visée, puis relâche — à brancher sur `@confirm`. */
  confirm: () => void
}

/**
 * Socle des suppressions confirmées **dans l'app** (vague 3.5) : la ligne
 * visée sert d'ouverture à `BaseConfirmModal`, et la confirmation envoie la
 * visite. Six écrans en tenaient chacun leur copie.
 *
 * `BaseConfirmModal.confirm()` émet `confirm` **puis** `update:open: false` :
 * la modale se referme donc d'elle-même, et le relâchement fait ici est le
 * même que celui que trois pages confiaient — pour rien — au `onFinish` de
 * leur visite.
 */
export function useRowDeleteConfirmation<T>(
  options: UseRowDeleteConfirmationOptions<T>
): RowDeleteConfirmation<T> {
  const target = ref<T | null>(null) as Ref<T | null>

  const isOpen = computed(() => target.value !== null)

  function ask(row: T) {
    target.value = row
  }

  function release() {
    target.value = null
  }

  function confirm() {
    const row = target.value
    if (row === null) return

    const url = options.url(row)
    if (options.visit === undefined) {
      router.delete(url)
    } else {
      router.delete(url, options.visit)
    }
    release()
  }

  return { target, isOpen, ask, release, confirm }
}
