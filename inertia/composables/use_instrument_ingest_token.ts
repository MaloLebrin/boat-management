import { usePage } from '@inertiajs/vue3'
import { computed, type ComputedRef } from 'vue'

/**
 * Jeton d'ingestion du plugin Signal K (#994), tel que flashé par la
 * génération : lisible **une seule fois**, dans la réponse qui suit la
 * redirection — le rechargement suivant l'efface. C'est un état d'écran, pas
 * un message : il ne passe donc pas par le toast des layouts.
 */
export function useInstrumentIngestToken(): ComputedRef<string | null> {
  const page = usePage()
  return computed(() => {
    const flash = (page.props as Record<string, unknown>).flash as
      | { instrumentIngestToken?: string }
      | undefined
    return flash?.instrumentIngestToken ?? null
  })
}
