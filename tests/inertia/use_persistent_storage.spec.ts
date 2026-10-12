import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// #952 — stockage persistant : la file IndexedDB et les caches doivent survivre
// à une traversée de plusieurs semaines.

type Mod = typeof import('../../inertia/composables/use_persistent_storage')
let mod: Mod

const originalStorage = Object.getOwnPropertyDescriptor(navigator, 'storage')

function setStorage(value: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value, configurable: true })
}

beforeEach(async () => {
  vi.resetModules()
  mod = await import('../../inertia/composables/use_persistent_storage')
})

afterEach(() => {
  if (originalStorage) Object.defineProperty(navigator, 'storage', originalStorage)
  else setStorage(undefined)
})

describe('requestPersistentStorage', () => {
  test('API absente : rend false sans lever', async () => {
    setStorage(undefined)
    const { persisted, estimate } = mod.usePersistentStorage()

    await expect(mod.requestPersistentStorage()).resolves.toBe(false)
    await expect(mod.refreshStorageEstimate()).resolves.toBeNull()
    expect(persisted.value).toBe(false)
    expect(estimate.value).toBeNull()
  })

  test('refus : persisted vaut false, estimate est exposé', async () => {
    const persist = vi.fn().mockResolvedValue(false)
    setStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist,
      estimate: vi.fn().mockResolvedValue({ usage: 10, quota: 100 }),
    })
    const { persisted, estimate } = mod.usePersistentStorage()

    await expect(mod.requestPersistentStorage()).resolves.toBe(false)
    expect(persist).toHaveBeenCalledOnce()
    expect(persisted.value).toBe(false)
    expect(estimate.value).toEqual({ usage: 10, quota: 100 })
  })

  test('accord : persisted vaut true', async () => {
    setStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
      estimate: vi.fn().mockResolvedValue({ usage: 5, quota: 50 }),
    })
    const { persisted, estimate } = mod.usePersistentStorage()

    await expect(mod.requestPersistentStorage()).resolves.toBe(true)
    expect(persisted.value).toBe(true)
    expect(estimate.value).toEqual({ usage: 5, quota: 50 })
  })

  test('déjà persistant : persist() n’est pas rappelé', async () => {
    const persist = vi.fn()
    setStorage({
      persisted: vi.fn().mockResolvedValue(true),
      persist,
      estimate: vi.fn().mockResolvedValue({}),
    })

    await expect(mod.requestPersistentStorage()).resolves.toBe(true)
    expect(persist).not.toHaveBeenCalled()
    expect(mod.usePersistentStorage().estimate.value).toEqual({ usage: 0, quota: 0 })
  })

  test('une seule demande par chargement de page, même après un refus', async () => {
    const persist = vi.fn().mockResolvedValue(false)
    setStorage({ persist, estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) })

    await Promise.all([mod.requestPersistentStorage(), mod.requestPersistentStorage()])
    await mod.requestPersistentStorage()

    expect(persist).toHaveBeenCalledOnce()
  })

  test('erreurs de l’API : rend false sans lever', async () => {
    setStorage({
      persist: vi.fn().mockRejectedValue(new Error('SecurityError')),
      estimate: vi.fn().mockRejectedValue(new Error('SecurityError')),
    })
    const { estimate } = mod.usePersistentStorage()

    await expect(mod.requestPersistentStorage()).resolves.toBe(false)
    expect(estimate.value).toBeNull()
  })
})

describe('déclencheurs', () => {
  test('appinstalled demande le stockage persistant', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    setStorage({ persist, estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) })
    vi.resetModules()
    await import('../../inertia/composables/use_pwa_install')

    window.dispatchEvent(new Event('appinstalled'))
    await vi.waitFor(() => expect(persist).toHaveBeenCalledOnce())
  })
})
