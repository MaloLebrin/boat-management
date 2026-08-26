import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * #498 — entonnoir d'installation iOS : Safari n'émet jamais
 * `beforeinstallprompt`, l'aide s'affiche sur Safari iOS hors PWA installée et
 * disparaît en standalone.
 */

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

import IosInstallHint from '../../inertia/components/pwa/IosInstallHint.vue'

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36'

function stubEnvironment({ ua, standalone }: { ua: string; standalone: boolean }) {
  vi.stubGlobal('navigator', {
    userAgent: ua,
    platform: ua.includes('iPhone') ? 'iPhone' : 'MacIntel',
    maxTouchPoints: ua.includes('iPhone') ? 5 : 0,
    standalone: standalone || undefined,
  })
  const originalMatchMedia = window.matchMedia
  vi.stubGlobal('window', {
    ...window,
    matchMedia: (query: string) =>
      query === '(display-mode: standalone)'
        ? ({ matches: standalone } as MediaQueryList)
        : originalMatchMedia.call(window, query),
  })
}

describe('IosInstallHint (#498)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  test('affiché sur Safari iOS hors PWA installée', () => {
    stubEnvironment({ ua: IOS_UA, standalone: false })
    const wrapper = mount(IosInstallHint)

    expect(wrapper.text()).toContain('common.push.ios.title')
    expect(wrapper.text()).toContain('common.push.ios.step1')
    expect(wrapper.text()).toContain('common.push.ios.step2')
    expect(wrapper.text()).toContain('common.push.ios.step3')
  })

  test('masqué quand la PWA est installée (standalone)', () => {
    stubEnvironment({ ua: IOS_UA, standalone: true })
    const wrapper = mount(IosInstallHint)

    expect(wrapper.find('div').exists()).toBe(false)
  })

  test('masqué hors iOS', () => {
    stubEnvironment({ ua: DESKTOP_UA, standalone: false })
    const wrapper = mount(IosInstallHint)

    expect(wrapper.find('div').exists()).toBe(false)
  })

  test('les clés sont traduites dans les deux locales', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const locale of ['en', 'fr'] as const) {
      const json = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/common.json`), 'utf8')
      ) as Record<string, string>
      for (const key of [
        'push.ios.title',
        'push.ios.step1',
        'push.ios.step2',
        'push.ios.step3',
        'push.optIn.title',
        'push.optIn.description',
        'push.optIn.enable',
        'push.optIn.later',
      ]) {
        expect(json[key], `common.${key} (${locale})`).toBeTruthy()
      }
    }
  })
})
