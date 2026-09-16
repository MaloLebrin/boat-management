import type { HttpContext } from '@adonisjs/core/http'

/**
 * Valeur brute du `?tab=` d'une page à onglets, transmise en prop `initialTab`
 * pour que le rendu SSR parte du bon onglet (#463). `null` sans paramètre :
 * le sérialiseur Inertia refuse `undefined`, et `null` dit au front « le
 * serveur n'a rien vu » — il ne doit alors pas relire `window.location`.
 */
export function initialTabParam(request: HttpContext['request']): string | null {
  const tabParam = request.qs().tab
  return typeof tabParam === 'string' && tabParam !== '' ? tabParam : null
}
