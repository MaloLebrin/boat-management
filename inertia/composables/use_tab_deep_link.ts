import { ref, watch, type Ref } from 'vue'

export interface TabDeepLinkOptions<K extends string> {
  /** Onglets acceptés dans `?tab=` ; toute autre valeur retombe sur `defaultTab`. */
  tabs: readonly K[]
  /** Onglet par défaut — jamais écrit dans l'URL. */
  defaultTab: K
  /**
   * Valeur brute du `?tab=` telle que vue par le serveur, fournie en prop de
   * page. Sans elle, six pages d'équipement lisaient `window.location` dans
   * `onMounted` : le rendu SSR partait de l'onglet par défaut puis basculait à
   * l'hydratation (flash). `undefined` = non fournie → lecture de `window`
   * côté client seulement ; `null` = le serveur n'a vu aucun paramètre.
   */
  initialTabParam?: string | null
}

/**
 * Onglet courant d'une page, synchronisé avec `?tab=` sans requête Inertia
 * (`history.replaceState`). Même contrat que `useBoatShowTabs`, pour les pages
 * à onglets plats (moteur, voile, gréement, équipements, pièce).
 */
export function useTabDeepLink<K extends string>(options: TabDeepLinkOptions<K>): Ref<K> {
  const raw = rawTabParam(options.initialTabParam)
  const initial = raw && (options.tabs as readonly string[]).includes(raw) ? (raw as K) : null
  const tab = ref(initial ?? options.defaultTab) as Ref<K>

  watch(tab, (newTab) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (newTab === options.defaultTab) {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', newTab)
    }
    window.history.replaceState(window.history.state, '', url.pathname + url.search)
  })

  return tab
}

function rawTabParam(fromServer: string | null | undefined): string | null {
  if (fromServer !== undefined) return fromServer
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('tab')
}
