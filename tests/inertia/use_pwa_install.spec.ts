import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// Reset module-level state between tests by re-importing
let usePwaInstall: typeof import('../../inertia/composables/use_pwa_install').usePwaInstall

function fireInstallPromptEvent(overrides?: Partial<{ outcome: 'accepted' | 'dismissed' }>) {
  const outcome = overrides?.outcome ?? 'accepted'
  const promptMock = vi.fn().mockResolvedValue(undefined)
  const userChoice = Promise.resolve({ outcome })
  const event = Object.assign(new Event('beforeinstallprompt'), {
    prompt: promptMock,
    userChoice,
  })
  window.dispatchEvent(event)
  return { promptMock, userChoice }
}

describe('usePwaInstall', () => {
  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../../inertia/composables/use_pwa_install')
    usePwaInstall = mod.usePwaInstall
  })

  test('canInstall is false before beforeinstallprompt fires', () => {
    const { canInstall } = usePwaInstall()
    expect(canInstall.value).toBe(false)
  })

  test('canInstall becomes true when beforeinstallprompt fires', async () => {
    fireInstallPromptEvent()
    await flushPromises()
    const { canInstall } = usePwaInstall()
    expect(canInstall.value).toBe(true)
  })

  test('promptInstall calls prompt() on the deferred event', async () => {
    const { promptMock } = fireInstallPromptEvent()
    await flushPromises()
    const { promptInstall } = usePwaInstall()
    await promptInstall()
    expect(promptMock).toHaveBeenCalledOnce()
  })

  test('canInstall becomes false after accepted install', async () => {
    fireInstallPromptEvent({ outcome: 'accepted' })
    await flushPromises()
    const { canInstall, promptInstall } = usePwaInstall()
    expect(canInstall.value).toBe(true)
    await promptInstall()
    await flushPromises()
    expect(canInstall.value).toBe(false)
  })

  test('canInstall stays true after dismissed install', async () => {
    fireInstallPromptEvent({ outcome: 'dismissed' })
    await flushPromises()
    const { canInstall, promptInstall } = usePwaInstall()
    expect(canInstall.value).toBe(true)
    await promptInstall()
    await flushPromises()
    expect(canInstall.value).toBe(true)
  })

  test('promptInstall does nothing when no deferred prompt is stored', async () => {
    const { promptInstall } = usePwaInstall()
    await expect(promptInstall()).resolves.toBeUndefined()
  })

  test('canInstall resets to false on appinstalled event', async () => {
    fireInstallPromptEvent()
    await flushPromises()
    const { canInstall } = usePwaInstall()
    expect(canInstall.value).toBe(true)
    window.dispatchEvent(new Event('appinstalled'))
    await flushPromises()
    expect(canInstall.value).toBe(false)
  })

  test('promptInstall renders correctly in a component', async () => {
    fireInstallPromptEvent()
    await flushPromises()
    const TestComponent = defineComponent({
      setup() {
        return usePwaInstall()
      },
      template: '<button v-if="canInstall" @click="promptInstall">Install</button>',
    })
    const wrapper = mount(TestComponent)
    expect(wrapper.find('button').exists()).toBe(true)
  })
})
