import { usePage } from '@inertiajs/vue3'
import { computed, type ComputedRef } from 'vue'

interface UseCurrentUserReturn {
  /** Identifiant de l'utilisateur connecté, `null` hors session. */
  currentUserId: ComputedRef<number | null>
}

/** Utilisateur connecté, lu sur la prop partagée `user` d'Inertia. */
export function useCurrentUser(): UseCurrentUserReturn {
  const page = usePage()

  const currentUserId = computed(
    () => (page.props.user as { id: number } | null | undefined)?.id ?? null
  )

  return { currentUserId }
}
