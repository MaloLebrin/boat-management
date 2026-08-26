/**
 * Parsing du payload push, extrait du service worker en fonction pure (#498) :
 * testable sans simuler un contexte SW.
 *
 * Contrat critique : le SW doit **toujours** appeler `showNotification`, même
 * sur un payload vide ou invalide — Safari comme Chrome désabonnent un
 * endpoint qui reçoit des push sans rien afficher. Cette fonction ne lève donc
 * jamais et renvoie toujours de quoi afficher.
 */

export interface ParsedPushPayload {
  title: string
  body: string | undefined
  /** URL ouverte au clic — relative à l'origine. */
  url: string
  /** Coalesce les alertes récurrentes du même type (pas douze « en retard »). */
  tag: string
}

export const PUSH_FALLBACK_TITLE = 'FleetAi'
const FALLBACK: ParsedPushPayload = {
  title: PUSH_FALLBACK_TITLE,
  body: undefined,
  url: '/notifications',
  tag: 'fleetai-generic',
}

export function parsePushPayload(raw: string | null | undefined): ParsedPushPayload {
  if (!raw) return FALLBACK

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    // Payload texte brut : on l'affiche tel quel plutôt que de le perdre
    return { ...FALLBACK, body: raw }
  }

  if (typeof data !== 'object' || data === null) return FALLBACK
  const payload = data as Record<string, unknown>

  const title = typeof payload.title === 'string' && payload.title ? payload.title : FALLBACK.title
  const body = typeof payload.body === 'string' && payload.body ? payload.body : undefined
  const type = typeof payload.type === 'string' && payload.type ? payload.type : 'generic'
  const actionUrl =
    typeof payload.actionUrl === 'string' && payload.actionUrl.startsWith('/')
      ? payload.actionUrl
      : FALLBACK.url

  return { title, body, url: actionUrl, tag: `fleetai-${type}` }
}
