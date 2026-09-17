import { router } from '@inertiajs/vue3'
import { useDebounceFn } from '@vueuse/core'
import { ref, watch, type Ref } from 'vue'

/** Délai de l'anti-rebond de la recherche, commun à toutes les listes. */
export const LIST_SEARCH_DEBOUNCE_MS = 300

export interface UseListFiltersOptions<F extends { q?: string; page: number }> {
  /** Filtres courants, tels que rendus par le serveur (getter réactif sur la prop). */
  filters: () => F
  /**
   * Applique les filtres complets : émettre `update:filters` vers la page, ou
   * visiter l'URL de la liste (`visitList`).
   */
  apply: (next: F) => void
  /**
   * Valeur de `q` retenue pour une saisie : chaque liste a sa convention
   * (`trim()` pour l'historique d'entretien, `undefined` si vide pour la
   * flotte…). Par défaut, la saisie telle quelle.
   */
  normalizeSearch?: (value: string) => F['q']
  debounceMs?: number
}

export interface UseListFilters<F> {
  /** Ce que l'utilisateur a tapé, affiché sans attendre la réponse du serveur. */
  qDraft: Ref<string>
  /** Fusionne `partial` dans les filtres courants et les applique. */
  update: (partial: Partial<F>) => void
  /** À brancher sur la saisie de recherche : brouillon immédiat, application après l'anti-rebond, page 1. */
  onSearchInput: (value: string) => void
}

/**
 * Socle des barres de filtres de liste (vague 3.5) : brouillon de recherche
 * synchronisé avec le serveur, anti-rebond, remise à la page 1. Remplace la
 * même vingtaine de lignes recopiée dans les barres des bateaux, moteurs,
 * clients, factures et de l'historique d'entretien.
 */
export function useListFilters<F extends { q?: string; page: number }>(
  options: UseListFiltersOptions<F>
): UseListFilters<F> {
  const normalizeSearch = options.normalizeSearch ?? ((value: string) => value as F['q'])
  const qDraft = ref(options.filters().q ?? '')

  watch(
    () => options.filters().q,
    (value) => {
      qDraft.value = value ?? ''
    }
  )

  function update(partial: Partial<F>) {
    options.apply({ ...options.filters(), ...partial })
  }

  const applySearch = useDebounceFn((value: string) => {
    update({ q: normalizeSearch(value), page: 1 } as Partial<F>)
  }, options.debounceMs ?? LIST_SEARCH_DEBOUNCE_MS)

  function onSearchInput(value: string) {
    qDraft.value = value
    applySearch(value)
  }

  return { qDraft, update, onSearchInput }
}

/**
 * Retire d'une query string les filtres vides (`''`, `null`, `undefined`) :
 * ils deviennent `undefined`, qu'Inertia n'écrit pas dans l'URL.
 */
export function compactQuery<Q extends Record<string, unknown>>(
  query: Q
): { [K in keyof Q]: Q[K] | undefined } {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      value === '' || value === null ? undefined : value,
    ])
  ) as { [K in keyof Q]: Q[K] | undefined }
}

/**
 * Visite d'une liste filtrée : l'entrée d'historique est remplacée (pas une
 * par frappe), le défilement et l'état local sont conservés.
 */
export function visitList(url: string, query: Record<string, unknown>): void {
  router.get(url, compactQuery(query) as Record<string, string | number | undefined>, {
    preserveScroll: true,
    preserveState: true,
    replace: true,
  })
}
