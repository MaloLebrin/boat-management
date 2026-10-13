import { flushPromises, mount } from '@vue/test-utils'
import { IDBFactory } from 'fake-indexeddb'
import { defineComponent, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// #969 — photos prises hors-ligne : mise en file avec pièces jointes et vignettes en attente.

vi.mock('vue-sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }))

const storage = vi.hoisted(() => ({
  estimate: null as { usage: number; quota: number } | null,
}))
vi.mock('~/composables/use_persistent_storage', () => ({
  requestPersistentStorage: vi.fn().mockResolvedValue(true),
  refreshStorageEstimate: vi.fn(async () => storage.estimate),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'fr', user: { id: 1 } } }),
  router: { post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}))

import { toast } from 'vue-sonner'
import { useOfflinePhotos, usePendingPhotos } from '../../inertia/composables/use_offline_photos'
import { useOfflineQueue } from '../../inertia/composables/use_offline_queue'

const MB = 1024 * 1024

function photo(name: string, bytes = 10) {
  return new File([new Uint8Array(bytes).fill(7)], name, { type: 'image/jpeg' })
}

function mountWith<T>(setup: () => T) {
  let result: T | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return {}
      },
      template: '<div />',
    })
  )
  return { wrapper, result: result! }
}

beforeEach(() => {
  vi.clearAllMocks()
  global.indexedDB = new IDBFactory()
  storage.estimate = null
  // happy-dom ne décode pas d'image : la compression rend le fichier d'origine.
  vi.stubGlobal('createImageBitmap', undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useOfflinePhotos.queuePhotos', () => {
  test('enfile une action upload-photos dont les octets sont gardés en pièces jointes', async () => {
    const { result } = mountWith(() => ({ ...useOfflinePhotos(), ...useOfflineQueue() }))

    const queued = await result.queuePhotos({
      url: '/boats/3/photos',
      files: [photo('a.jpg', 12), photo('b.jpg', 5)],
    })

    expect(queued).toBe(true)
    const [action] = result.pendingActions.value
    expect(action.type).toBe('upload-photos')
    expect(action.url).toBe('/boats/3/photos')
    expect(action.method).toBe('post')
    expect(action.payload).toEqual({})
    expect(action.dependsOn).toBeUndefined()
    expect(
      action.attachments?.map(({ field, name, type, data }) => [field, name, type, data.byteLength])
    ).toEqual([
      ['files', 'a.jpg', 'image/jpeg', 12],
      ['files', 'b.jpg', 'image/jpeg', 5],
    ])
  })

  test('rattache les photos à la création parente par son jeton', async () => {
    const { result } = mountWith(() => ({ ...useOfflinePhotos(), ...useOfflineQueue() }))

    await result.queuePhotos({
      url: '/boats/3/incidents/tmp_abc/photos',
      files: [photo('a.jpg')],
      dependsOn: 'tmp_abc',
    })

    expect(result.pendingActions.value[0].dependsOn).toBe('tmp_abc')
  })

  test('refuse une photo trop lourde même réduite, sans rien enfiler', async () => {
    const { result } = mountWith(() => ({ ...useOfflinePhotos(), ...useOfflineQueue() }))

    const queued = await result.queuePhotos({
      url: '/boats/3/photos',
      files: [photo('ok.jpg'), photo('enorme.jpg', 10 * MB + 1)],
    })

    expect(queued).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('common.offline.photos.tooLarge')
    // `enqueue` n'a pas été atteint : il annonce chaque mise en file.
    expect(toast.info).not.toHaveBeenCalled()
  })

  test("refuse proprement quand l'appareil manque de place", async () => {
    storage.estimate = { usage: 95 * MB, quota: 100 * MB }
    const { result } = mountWith(() => ({ ...useOfflinePhotos(), ...useOfflineQueue() }))

    const queued = await result.queuePhotos({ url: '/boats/3/photos', files: [photo('a.jpg')] })

    expect(queued).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('common.offline.photos.quotaExceeded')
    // `enqueue` n'a pas été atteint : il annonce chaque mise en file.
    expect(toast.info).not.toHaveBeenCalled()
  })

  test('une écriture IndexedDB refusée (quota réel) est signalée, pas levée', async () => {
    const { result } = mountWith(() => useOfflinePhotos())
    const failing = photo('a.jpg')
    vi.spyOn(failing, 'arrayBuffer').mockRejectedValue(
      new DOMException('full', 'QuotaExceededError')
    )

    const queued = await result.queuePhotos({ url: '/boats/3/photos', files: [failing] })

    expect(queued).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('common.offline.photos.saveFailed')
  })

  test('sans IndexedDB, la photo n’est pas annoncée comme gardée', async () => {
    const { result } = mountWith(() => useOfflinePhotos())
    vi.stubGlobal('indexedDB', undefined)

    const queued = await result.queuePhotos({ url: '/boats/3/photos', files: [photo('a.jpg')] })

    expect(queued).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('common.offline.photos.saveFailed')
  })

  test('un lot vide ne fait rien', async () => {
    const { result } = mountWith(() => ({ ...useOfflinePhotos(), ...useOfflineQueue() }))

    expect(await result.queuePhotos({ url: '/boats/3/photos', files: [] })).toBe(true)
    // `enqueue` n'a pas été atteint : il annonce chaque mise en file.
    expect(toast.info).not.toHaveBeenCalled()
  })
})

describe('usePendingPhotos', () => {
  test('montre les photos en file pour cette galerie seulement, et révoque leurs URLs', async () => {
    let counter = 0
    const createObjectURL = vi.fn(() => `blob:${++counter}`)
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))

    const { wrapper, result } = mountWith(() => ({
      ...useOfflinePhotos(),
      ...useOfflineQueue(),
      ...usePendingPhotos('/boats/3/photos'),
    }))
    await result.queuePhotos({ url: '/boats/3/photos', files: [photo('a.jpg'), photo('b.jpg')] })
    await result.queuePhotos({ url: '/boats/9/photos', files: [photo('autre.jpg')] })
    await nextTick()

    expect(result.pendingPhotos.value.map((pending) => [pending.name, pending.src])).toEqual([
      ['a.jpg', 'blob:1'],
      ['b.jpg', 'blob:2'],
    ])
    expect(createObjectURL).toHaveBeenCalledTimes(2)

    // Une photo synchronisée quitte la file : sa vignette et son URL disparaissent.
    await result.cancelAction(result.pendingActions.value[0].id!)
    await flushPromises()
    expect(result.pendingPhotos.value).toEqual([])
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:1')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:2')

    await result.queuePhotos({ url: '/boats/3/photos', files: [photo('c.jpg')] })
    await nextTick()
    wrapper.unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:3')
  })
})
