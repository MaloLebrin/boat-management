import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * #498 — opt-in Web Push. `navigator.serviceWorker` et `PushManager` sont
 * absents de happy-dom : tout est stubbé. L'assertion la plus importante :
 * **aucun appel à `pushManager.subscribe` hors geste utilisateur** — le
 * composable ne fait que lire l'état à l'initialisation.
 */

const mockRouterPost = vi.hoisted(() => vi.fn())
const mockRouterDelete = vi.hoisted(() => vi.fn())
const mockVapidKey = vi.hoisted(() => ({ value: 'BPUBLICKEY' as string | undefined }))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en', vapidPublicKey: mockVapidKey.value } }),
  router: { post: mockRouterPost, delete: mockRouterDelete },
}))

import {
  urlBase64ToUint8Array,
  usePushNotifications,
} from '../../inertia/composables/use_push_notifications'

const mockSubscribe = vi.fn()
const mockGetSubscription = vi.fn()
const mockUnsubscribe = vi.fn()
const mockRequestPermission = vi.fn()

function stubPushEnvironment({ permission = 'default' as NotificationPermission } = {}) {
  const fakeSubscription = {
    endpoint: 'https://push.example/e1',
    toJSON: () => ({ endpoint: 'https://push.example/e1', keys: { p256dh: 'p', auth: 'a' } }),
    unsubscribe: mockUnsubscribe,
  }
  mockSubscribe.mockResolvedValue(fakeSubscription)
  mockUnsubscribe.mockResolvedValue(true)

  const registration = {
    pushManager: { subscribe: mockSubscribe, getSubscription: mockGetSubscription },
  }
  vi.stubGlobal('navigator', {
    serviceWorker: { ready: Promise.resolve(registration) },
  })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', {
    permission,
    requestPermission: mockRequestPermission,
  })
  return { fakeSubscription }
}

function mountComposable() {
  let result: ReturnType<typeof usePushNotifications> | undefined
  mount(
    defineComponent({
      setup() {
        result = usePushNotifications()
        return {}
      },
      template: '<div />',
    })
  )
  return result!
}

describe('usePushNotifications (#498)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    mockVapidKey.value = 'BPUBLICKEY'
    mockGetSubscription.mockResolvedValue(null)
  })

  test("l'initialisation ne déclenche jamais pushManager.subscribe (pas de prompt à froid)", async () => {
    stubPushEnvironment()
    mountComposable()
    await new Promise((r) => setTimeout(r, 10))

    expect(mockSubscribe).not.toHaveBeenCalled()
    expect(mockRequestPermission).not.toHaveBeenCalled()
  })

  test('subscribe() demande la permission puis pousse l’abonnement au serveur', async () => {
    stubPushEnvironment()
    mockRequestPermission.mockResolvedValue('granted')
    const { subscribe, isSubscribed } = mountComposable()

    const ok = await subscribe()

    expect(ok).toBe(true)
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true, applicationServerKey: expect.anything() })
    )
    expect(mockRouterPost).toHaveBeenCalledWith(
      '/push/subscriptions',
      expect.objectContaining({ endpoint: 'https://push.example/e1' }),
      expect.objectContaining({ preserveScroll: true })
    )
    expect(isSubscribed.value).toBe(true)
  })

  test('permission refusée : pas d’abonnement, pas d’appel serveur', async () => {
    stubPushEnvironment()
    mockRequestPermission.mockResolvedValue('denied')
    const { subscribe, permission, isSubscribed } = mountComposable()
    // État partagé au niveau module : remis à zéro (le test précédent a abonné)
    isSubscribed.value = false

    const ok = await subscribe()

    expect(ok).toBe(false)
    expect(mockSubscribe).not.toHaveBeenCalled()
    expect(mockRouterPost).not.toHaveBeenCalled()
    expect(permission.value).toBe('denied')
    expect(isSubscribed.value).toBe(false)
  })

  test('sans clé VAPID partagée, subscribe() refuse sans prompter', async () => {
    stubPushEnvironment()
    mockVapidKey.value = undefined
    const { subscribe } = mountComposable()

    const ok = await subscribe()

    expect(ok).toBe(false)
    expect(mockRequestPermission).not.toHaveBeenCalled()
  })

  test('unsubscribe() coupe côté navigateur puis côté serveur', async () => {
    const { fakeSubscription } = stubPushEnvironment({ permission: 'granted' })
    mockGetSubscription.mockResolvedValue(fakeSubscription)
    const { unsubscribe, isSubscribed } = mountComposable()

    await unsubscribe()

    expect(mockUnsubscribe).toHaveBeenCalled()
    expect(mockRouterDelete).toHaveBeenCalledWith(
      '/push/subscriptions',
      expect.objectContaining({
        data: { endpoint: 'https://push.example/e1' },
        preserveScroll: true,
      })
    )
    expect(isSubscribed.value).toBe(false)
  })

  test('urlBase64ToUint8Array convertit la clé VAPID base64url', () => {
    // 'AQID' = base64 de [1, 2, 3]
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([1, 2, 3])
    // Variante base64url avec - et _
    const converted = urlBase64ToUint8Array('-_8')
    expect([...converted]).toEqual([251, 255])
  })
})
