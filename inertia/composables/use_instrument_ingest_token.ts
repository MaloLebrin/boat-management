import { router, usePage } from '@inertiajs/vue3'
import { computed, ref, type ComputedRef } from 'vue'

interface KeptToken {
  path: string
  token: string
}

/**
 * Le flash ne vit que le temps d'une réponse, or les props différées de
 * l'onglet (requêtes partielles qui suivent la visite) l'effacent et démontent
 * l'onglet avant qu'il ne l'affiche. On le capte donc au niveau du routeur,
 * hors de tout composant, et on le garde pour la page qui l'a reçu.
 */
const kept = ref<KeptToken | null>(null)
let listening = false

function pathOf(url: string): string {
  return url.split('?')[0]
}

function listen() {
  if (listening || typeof window === 'undefined' || typeof router?.on !== 'function') return
  listening = true
  router.on('success', (event) => {
    const flash = (event.detail.page.props as Record<string, unknown>).flash as
      | { instrumentIngestToken?: string }
      | undefined
    const token = flash?.instrumentIngestToken
    if (token) kept.value = { path: pathOf(event.detail.page.url), token }
  })
}

/**
 * Jeton d'ingestion du plugin Signal K (#994), tel que flashé par la
 * génération : lisible **une seule fois**, dans la réponse qui suit la
 * redirection. C'est un état d'écran, pas un message : il ne passe donc pas
 * par le toast des layouts.
 */
export function useInstrumentIngestToken(): ComputedRef<string | null> {
  listen()
  const page = usePage()
  return computed(() => {
    const flash = (page.props as Record<string, unknown>).flash as
      | { instrumentIngestToken?: string }
      | undefined
    if (flash?.instrumentIngestToken) return flash.instrumentIngestToken
    const current = kept.value
    return current && current.path === pathOf(page.url ?? '') ? current.token : null
  })
}
