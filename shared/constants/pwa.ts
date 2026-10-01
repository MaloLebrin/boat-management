/**
 * Identité stable de la PWA installée (#865).
 *
 * `id` reste `/` même si `start_url` change : sans lui, Chrome dérive
 * l'identité de `start_url` et un changement ferait apparaître une seconde app.
 */
export const PWA_ID = '/'

export const PWA_SCOPE = '/'

export const PWA_SOURCE = 'pwa'

export const PWA_START_URL = `/dashboard?source=${PWA_SOURCE}`

/** Une fois par session : un rechargement du tableau de bord ne compte pas deux fois. */
export const PWA_LAUNCH_SESSION_KEY = 'pwaLaunchCounted'

export const PWA_SHORTCUTS = [
  { key: 'newTrip', path: '/navigation/logbook' },
  { key: 'fuel', path: '/navigation/fuel' },
  { key: 'incident', path: '/navigation/incidents' },
  { key: 'fleet', path: '/boats' },
] as const

export type PwaShortcutKey = (typeof PWA_SHORTCUTS)[number]['key']

export const PWA_SCREENSHOTS = [
  {
    src: '/pwa/screenshot-wide.png',
    sizes: '1280x720',
    formFactor: 'wide',
    labelKey: 'wide',
  },
  {
    src: '/pwa/screenshot-narrow.png',
    sizes: '720x1280',
    formFactor: 'narrow',
    labelKey: 'narrow',
  },
] as const

export const PWA_ICON_192 = '/web-app-manifest-192x192.png'
export const PWA_ICON_512 = '/web-app-manifest-512x512.png'
export const PWA_SHORTCUT_ICON = '/favicon-96x96.png'
