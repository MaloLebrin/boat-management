import { router, usePage } from '@inertiajs/vue3'
import { ref } from 'vue'

/**
 * Opt-in Web Push (#498). Règle à ne pas contourner : `subscribe()` doit être
 * appelé depuis un **geste utilisateur** (clic) — jamais au montage, jamais de
 * prompt à froid. Le composable ne fait que lire l'état à l'initialisation.
 */

// État partagé au niveau module (un seul abonnement navigateur par onglet)
const permission = ref<NotificationPermission | 'unsupported'>('unsupported')
const isSubscribed = ref(false)
const isBusy = ref(false)
let stateInitialized = false

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Clé VAPID base64url → `Uint8Array` attendu par `pushManager.subscribe`. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.codePointAt(i)!
  }
  return outputArray
}

async function refreshSubscriptionState() {
  if (!isPushSupported()) return
  permission.value = Notification.permission
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    isSubscribed.value = subscription !== null
  } catch {
    isSubscribed.value = false
  }
}

export function usePushNotifications() {
  const page = usePage()
  const isSupported = isPushSupported()

  if (!stateInitialized && isSupported) {
    stateInitialized = true
    refreshSubscriptionState()
  }

  /** À appeler depuis un gestionnaire de clic uniquement (exigence navigateur). */
  async function subscribe(): Promise<boolean> {
    const vapidPublicKey = page.props.vapidPublicKey as string | undefined
    if (!isSupported || !vapidPublicKey || isBusy.value) return false
    isBusy.value = true

    try {
      const result = await Notification.requestPermission()
      permission.value = result
      if (result !== 'granted') return false

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })

      router.post('/push/subscriptions', subscription.toJSON() as Record<string, string>, {
        preserveScroll: true,
        preserveState: true,
      })
      isSubscribed.value = true
      return true
    } catch {
      return false
    } finally {
      isBusy.value = false
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!isSupported || isBusy.value) return
    isBusy.value = true

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        isSubscribed.value = false
        return
      }
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      isSubscribed.value = false
      router.delete('/push/subscriptions', {
        data: { endpoint },
        preserveScroll: true,
        preserveState: true,
      })
    } finally {
      isBusy.value = false
    }
  }

  return { isSupported, permission, isSubscribed, isBusy, subscribe, unsubscribe }
}
