import type { Data } from '@generated/data'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

/**
 * Lien de sortie des pages d'erreur (403/404/500).
 *
 * Un utilisateur connecté repart vers son tableau de bord — chaque rôle y a une
 * vue dédiée (`HomeController#index` route le mécanicien et le propriétaire).
 * Un visiteur anonyme repart vers l'accueil public : `/dashboard` le renverrait
 * sur l'écran de connexion, ce qui ressemble à une seconde erreur (#458).
 *
 * @param dashboardActionKey clé i18n du libellé « retour au tableau de bord »
 *   propre à la page appelante.
 */
export function useErrorPageExit(dashboardActionKey: string) {
  const page = usePage<Data.SharedProps>()

  const isAuthenticated = computed(() => Boolean(page.props.user))
  const href = computed(() => (isAuthenticated.value ? '/dashboard' : '/'))
  const labelKey = computed(() => (isAuthenticated.value ? dashboardActionKey : 'errors.backHome'))

  return { isAuthenticated, href, labelKey }
}
