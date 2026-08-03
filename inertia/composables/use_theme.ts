import { router, usePage } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '#shared/types/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/**
 * Applique le thème sur `<html data-theme="…">`. C'est le même attribut que
 * pose le serveur (ou le script anti-FOUC) : la source de vérité reste unique.
 */
function applyTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Préférence de thème (#416).
 *
 * `preference` vient de la prop partagée Inertia (profil > cookie > `system`).
 * `resolved` est le thème réellement appliqué — `system` y est résolu via
 * `prefers-color-scheme`, et suivi à chaud si l'utilisateur change le réglage
 * de son OS pendant la session.
 */
export function useTheme() {
  const page = usePage()

  const preference = computed<ThemePreference>(() => {
    const value = (page.props as any).theme
    return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE
  })

  const resolved = ref<ResolvedTheme>(
    preference.value === 'system' ? systemTheme() : preference.value
  )

  function setTheme(next: ThemePreference) {
    if (next === preference.value) return

    // Retour visuel immédiat : on n'attend pas le round-trip serveur.
    resolved.value = next === 'system' ? systemTheme() : next
    applyTheme(resolved.value)

    // Route authentifiée quand c'est possible (persiste en base), route
    // publique sinon — le switcher est aussi présent sur le marketing et le
    // login. Visite Inertia dans les deux cas : jamais de fetch/CSRF manuel.
    const isAuthenticated = Boolean((page.props as any).user)
    if (isAuthenticated) {
      router.put('/settings/theme', { theme: next }, { preserveScroll: true, preserveState: true })
    } else {
      router.post('/theme', { theme: next }, { preserveScroll: true, preserveState: true })
    }
  }

  let media: MediaQueryList | undefined

  function onSystemChange(event: MediaQueryListEvent) {
    if (preference.value !== 'system') return
    resolved.value = event.matches ? 'dark' : 'light'
    applyTheme(resolved.value)
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    media = window.matchMedia(DARK_QUERY)
    media.addEventListener('change', onSystemChange)
  })

  onBeforeUnmount(() => {
    media?.removeEventListener('change', onSystemChange)
  })

  return { preference, resolved, setTheme }
}
