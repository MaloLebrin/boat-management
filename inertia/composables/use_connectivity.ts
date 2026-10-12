import { onMounted, onUnmounted, readonly, ref } from 'vue'

/**
 * Connectivité réelle (#953, épic « Mode traversée » #949).
 *
 * `navigator.onLine` est vrai dès que le Wi-Fi de bord est associé, même sans
 * WAN (Starlink en obstruction, satellite saturé) : se synchroniser sur
 * l'événement `online` brut lançait un drain qui échouait en boucle. L'état
 * réel combine le navigateur et une probe `HEAD /up` :
 *
 * - `offline` : le navigateur se dit hors-ligne, aucune probe ;
 * - `degraded` : réseau local présent mais `/up` injoignable, en erreur ou trop lent ;
 * - `online` : `/up` a répondu 2xx.
 *
 * La probe tourne toutes les 30 s en `degraded`, toutes les 5 min en `online`,
 * et se met en pause quand l'onglet passe en arrière-plan.
 */

export type ConnectivityState = 'online' | 'degraded' | 'offline'

export const PROBE_URL = '/up'
export const PROBE_TIMEOUT_MS = 5000
export const PROBE_INTERVAL_DEGRADED_MS = 30_000
export const PROBE_INTERVAL_ONLINE_MS = 5 * 60_000

// Issue #459 — en SSR, `navigator.onLine` vaut `undefined` : seul un `false`
// explicite vaut hors-ligne, sinon le bandeau serait rendu dans le HTML SSR.
export function readNavigatorOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

// État module-level : le layout pilote la probe, `useNetworkStatus` en dérive.
const state = ref<ConnectivityState>(readNavigatorOnline() ? 'online' : 'offline')
/** Incrémenté à chaque probe réussie — le layout y accroche le drain de la file. */
const reachableCount = ref(0)

let timer: ReturnType<typeof setTimeout> | null = null
let inFlight: Promise<ConnectivityState> | null = null
let monitors = 0

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

function scheduleNext() {
  clearTimer()
  if (monitors === 0 || state.value === 'offline' || isHidden()) return
  const delay = state.value === 'online' ? PROBE_INTERVAL_ONLINE_MS : PROBE_INTERVAL_DEGRADED_MS
  timer = setTimeout(() => {
    timer = null
    void probeConnectivity()
  }, delay)
}

async function runProbe(): Promise<ConnectivityState> {
  if (!readNavigatorOnline()) return 'offline'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const response = await fetch(PROBE_URL, {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
    // 503 : le serveur répond mais ne peut pas enregistrer — inutile de rejouer.
    return response.ok ? 'online' : 'degraded'
  } catch {
    return 'degraded'
  } finally {
    clearTimeout(timeout)
  }
}

/** Lance une probe immédiate (une seule à la fois) et reprogramme la suivante. */
export function probeConnectivity(): Promise<ConnectivityState> {
  clearTimer()
  inFlight ??= runProbe().then((next) => {
    inFlight = null
    state.value = next
    if (next === 'online') reachableCount.value += 1
    scheduleNext()
    return next
  })
  return inFlight
}

function onOnline() {
  void probeConnectivity()
}

function onOffline() {
  clearTimer()
  state.value = 'offline'
}

function onVisibilityChange() {
  if (isHidden()) clearTimer()
  else void probeConnectivity()
}

function start() {
  monitors += 1
  if (monitors > 1) return
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisibilityChange)
  void probeConnectivity()
}

function stop() {
  monitors = Math.max(0, monitors - 1)
  if (monitors > 0) return
  clearTimer()
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  document.removeEventListener('visibilitychange', onVisibilityChange)
}

/**
 * Lecture seule de l'état — sans démarrer la probe. Utilisé par
 * `useNetworkStatus` dans les formulaires.
 */
export function connectivityState() {
  return readonly(state)
}

/** Démarre la surveillance pour la durée de vie du composant (layout `default`). */
export function useConnectivity() {
  onMounted(start)
  onUnmounted(stop)
  return {
    state: readonly(state),
    reachableCount: readonly(reachableCount),
    probeConnectivity,
  }
}
