import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type {
  InstrumentsTabProps,
  InstrumentSourceConnection,
} from '../../shared/types/instruments'

const h = await vi.hoisted(async () => {
  const { shallowRef } = await import('vue')
  return {
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    reload: vi.fn(),
    flash: shallowRef<Record<string, unknown>>({}),
    probe: vi.fn(),
  }
})

vi.mock('@inertiajs/vue3', () => ({
  useForm: (initial: Record<string, unknown>) => {
    let transformFn: ((data: any) => unknown) | null = null
    const form: any = {
      ...initial,
      errors: {},
      processing: false,
      transform(fn: (data: any) => unknown) {
        transformFn = fn
        return form
      },
      put: (url: string, options: unknown) => h.put(url, transformFn?.(form), options),
    }
    return form
  },
  router: { post: h.post, patch: h.patch, reload: h.reload },
  usePage: () => ({
    get props() {
      return { flash: h.flash.value, appT: {}, locale: 'fr' }
    },
  }),
}))
vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
    locale: { value: 'fr' },
  }),
}))
vi.mock('~/lib/signalk/probe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../inertia/lib/signalk/probe')>()
  h.probe.mockImplementation(actual.probeSignalKServer)
  return { ...actual, probeSignalKServer: h.probe }
})

import InstrumentSetupWizard from '../../inertia/components/boats/show/tabs/instruments/setup/InstrumentSetupWizard.vue'

const source = (over: Partial<InstrumentSourceConnection> = {}): InstrumentSourceConnection => ({
  id: 3,
  boatId: 9,
  kind: 'signalk',
  baseUrl: 'https://sk.local:3443',
  vesselContext: 'vessels.self',
  enabled: true,
  hasToken: false,
  hasIngestToken: false,
  ingestTokenIssuedAt: null,
  lastSeenAt: null,
  lastError: null,
  token: null,
  ...over,
})

const tab = (over: Partial<InstrumentsTabProps> = {}): InstrumentsTabProps => ({
  source: null,
  latest: [],
  recent: {},
  rules: [],
  openAlerts: [],
  aisTargets: [],
  can: { manage: true, ingest: true },
  ...over,
})

const mountWizard = (instruments = tab(), engines: unknown[] = []) =>
  mount(InstrumentSetupWizard, {
    props: { boatId: 9, instruments, engines: engines as never, streamOpen: false },
  })

const original = window.location
function pageOn(protocol: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { protocol, origin: 'https://app.fleetai.test', assign: vi.fn() },
  })
}
const stored = (value: object) =>
  window.localStorage.setItem('fleetai:instrument-setup:9', JSON.stringify(value))

beforeEach(() => {
  vi.clearAllMocks()
  h.flash.value = {}
  window.localStorage.clear()
  pageOn('https:')
})
afterEach(() => Object.defineProperty(window, 'location', { configurable: true, value: original }))

describe('parcours plugin (#1023)', () => {
  test('matériel → chemin → adresse préremplie → enregistrement avec rechargement complet', async () => {
    const wrapper = mountWizard()
    await wrapper.find('[data-testid="instrument-setup-hardware-signalk"]').trigger('click')
    expect(wrapper.find('[data-testid="instrument-setup-path"]').exists()).toBe(true)

    await wrapper.find('[data-testid="instrument-setup-path-plugin"]').trigger('click')
    const input = wrapper.find('input[name="setupBaseUrl"]')
    expect((input.element as HTMLInputElement).value).toBe('http://openplotter.local:3000')
    expect(JSON.parse(window.localStorage.getItem('fleetai:instrument-setup:9')!)).toMatchObject({
      hardware: 'signalk',
      path: 'plugin',
    })

    await wrapper.find('form').trigger('submit')
    expect(h.put).toHaveBeenCalledWith(
      '/boats/9/instrument-source',
      { baseUrl: 'http://openplotter.local:3000', enabled: true },
      expect.anything()
    )
    h.put.mock.calls[0][2].onSuccess()
    expect(window.location.assign).toHaveBeenCalledWith('/boats/9?tab=instruments')
  })

  test('adresse vide : adresse par défaut enregistrée', async () => {
    stored({ hardware: 'none', path: 'plugin' })
    const wrapper = mountWizard()
    await flushPromises()
    await wrapper.find('form').trigger('submit')
    expect(h.put.mock.calls[0][1]).toEqual({ baseUrl: 'http://signalk.local:3000', enabled: true })
  })

  test('source sans jeton : génération par router.post', async () => {
    stored({ hardware: 'signalk', path: 'plugin' })
    const wrapper = mountWizard(tab({ source: source() }))
    await flushPromises()
    await wrapper.find('[data-testid="instrument-setup-generate"]').trigger('click')
    expect(h.post).toHaveBeenCalledWith(
      '/boats/9/instrument-source/ingest-token',
      {},
      { preserveScroll: true }
    )
  })

  test('jeton flashé : la commande porte l’origine et le jeton, l’attente démarre, puis le premier lot', async () => {
    stored({ hardware: 'signalk', path: 'plugin' })
    h.flash.value = { instrumentIngestToken: 'fai_ing_SECRET' }
    const wrapper = mountWizard(tab({ source: source({ hasIngestToken: true }) }))
    await flushPromises()

    const code = wrapper.find('[data-testid="base-code-block"]').text()
    expect(code).toContain('https://app.fleetai.test/install/signalk-plugin.sh')
    expect(code).toContain('fai_ing_SECRET')
    expect(wrapper.find('[data-testid="instrument-setup-token-lost"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="instrument-setup-waiting"]').text()).toContain(
      'instruments.setup.waiting.waiting'
    )

    await wrapper.setProps({
      instruments: tab({
        source: source({
          hasIngestToken: true,
          lastSeenAt: new Date(Date.now() + 5000).toISOString(),
        }),
      }),
    })
    // Connecté, aucun moteur à relier : l'étape « Terminé » prend la main.
    expect(wrapper.find('[data-step="connect"]').attributes('data-done')).toBe('true')
    expect(wrapper.find('[data-testid="instrument-setup-done"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('jeton déjà perdu : commande avec emplacement et bouton de régénération', async () => {
    stored({ hardware: 'signalk', path: 'plugin' })
    const wrapper = mountWizard(tab({ source: source({ hasIngestToken: true }) }))
    await flushPromises()
    expect(wrapper.find('[data-testid="base-code-block"]').text()).toContain('fai_ing_…')
    expect(wrapper.find('[data-testid="instrument-setup-token-lost"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('terminé : premières mesures, masquer l’assistant puis le rouvrir', async () => {
    stored({ hardware: 'signalk', path: 'plugin' })
    const wrapper = mountWizard(
      tab({
        source: source({ hasIngestToken: true }),
        latest: [
          { path: 'navigation.speedOverGround', recordedAt: 'x', value: 1, valueJson: null },
        ],
      })
    )
    await flushPromises()
    await wrapper.setProps({
      instruments: tab({
        source: source({ hasIngestToken: true, lastSeenAt: new Date().toISOString() }),
        latest: [
          { path: 'navigation.speedOverGround', recordedAt: 'x', value: 1, valueJson: null },
        ],
      }),
    })
    const done = wrapper.find('[data-testid="instrument-setup-done"]')
    expect(done.text()).toContain('instruments.setup.done.readings{"count":1}')

    await wrapper.find('[data-testid="instrument-setup-dismiss"]').trigger('click')
    expect(wrapper.find('[data-testid="instrument-setup"]').exists()).toBe(false)
    expect(JSON.parse(window.localStorage.getItem('fleetai:instrument-setup:9')!).dismissed).toBe(
      true
    )

    await wrapper.find('[data-testid="instrument-setup-reopen"]').trigger('click')
    expect(wrapper.find('[data-testid="instrument-setup"]').exists()).toBe(true)
  })

  test('une source déjà au vert à l’ouverture ne montre pas l’assistant', async () => {
    const wrapper = mountWizard(
      tab({ source: source({ hasIngestToken: true, lastSeenAt: new Date().toISOString() }) })
    )
    await flushPromises()
    expect(wrapper.find('[data-testid="instrument-setup"]').exists()).toBe(false)
  })
})

describe('parcours application (#1023)', () => {
  const fill = async (wrapper: ReturnType<typeof mountWizard>, baseUrl: string) => {
    await wrapper.find('input[name="setupBrowserBaseUrl"]').setValue(baseUrl)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  }

  test('pré-vol : contenu mixte arrêté sans requête ni enregistrement', async () => {
    stored({ hardware: 'signalk', path: 'app' })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const wrapper = mountWizard()
    await flushPromises()
    await fill(wrapper, 'http://boat.local:3000')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(h.put).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="instrument-setup-error"]').text()).toContain(
      'instruments.setup.diagnostic.error.mixed_content'
    )
    fetchSpy.mockRestore()
  })

  test('adresse invalide : arrêtée au pré-vol', async () => {
    stored({ hardware: 'none', path: 'app' })
    const wrapper = mountWizard()
    await flushPromises()
    await fill(wrapper, 'pas une adresse')
    expect(h.put).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="instrument-setup-error"]').text()).toContain('invalid_url')
  })

  test('nouvelle origine : enregistrement, drapeau pendingTest et rechargement complet', async () => {
    stored({ hardware: 'signalk', path: 'app' })
    const wrapper = mountWizard()
    await flushPromises()
    await wrapper.find('input[name="setupBrowserToken"]').setValue('lecture')
    await fill(wrapper, 'https://sk.local:3443')

    expect(h.put).toHaveBeenCalledWith(
      '/boats/9/instrument-source',
      { baseUrl: 'https://sk.local:3443', enabled: true, token: 'lecture' },
      expect.anything()
    )
    h.put.mock.calls[0][2].onSuccess()
    expect(window.location.assign).toHaveBeenCalledWith('/boats/9?tab=instruments')
    expect(JSON.parse(window.localStorage.getItem('fleetai:instrument-setup:9')!).pendingTest).toBe(
      true
    )
  })

  test('même origine : sonde immédiate et inventaire affiché', async () => {
    stored({ hardware: 'signalk', path: 'app' })
    const wrapper = mountWizard(tab({ source: source({ token: 'tok' }) }))
    await flushPromises()
    h.probe.mockResolvedValueOnce({ ok: true, inventory: null }) // pré-vol
    h.probe.mockResolvedValueOnce({
      ok: true,
      inventory: {
        serverVersion: '2.8.0',
        vesselName: 'Aventure',
        engineIds: ['port', 'starboard'],
        batteryIds: ['0'],
        tankIds: [],
        hasPosition: true,
      },
    })
    await fill(wrapper, 'https://sk.local:3443')
    h.put.mock.calls[0][2].onSuccess()
    await flushPromises()

    expect(h.probe).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseUrl: 'https://sk.local:3443', token: 'tok' })
    )
    const ok = wrapper.find('[data-testid="instrument-setup-success"]').text()
    expect(ok).toContain('"version":"2.8.0"')
    expect(ok).toContain('"name":"Aventure"')
    expect(ok).toContain('{"count":2} (port, starboard)')
    expect(ok).toContain('instruments.setup.diagnostic.positionOk')
  })

  test('retour du rechargement complet : la sonde se relance seule, le drapeau est effacé', async () => {
    stored({ hardware: 'signalk', path: 'app', pendingTest: true })
    h.probe.mockResolvedValueOnce({ ok: false, error: 'unauthorized', status: 401 })
    const wrapper = mountWizard(tab({ source: source({ token: 'tok' }) }))
    await flushPromises()

    expect(h.probe).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'https://sk.local:3443', token: 'tok' })
    )
    expect(wrapper.find('[data-testid="instrument-setup-error"]').text()).toContain('unauthorized')
    expect(JSON.parse(window.localStorage.getItem('fleetai:instrument-setup:9')!).pendingTest).toBe(
      false
    )
  })
})

describe('jeton flashé conservé (#1023)', () => {
  test('la commande garde le jeton quand le flash disparaît d’un rechargement partiel', async () => {
    stored({ hardware: 'signalk', path: 'plugin' })
    h.flash.value = { instrumentIngestToken: 'fai_ing_KEEP' }
    const wrapper = mountWizard(tab({ source: source({ hasIngestToken: true }) }))
    await flushPromises()
    expect(wrapper.find('[data-testid="base-code-block"]').text()).toContain('fai_ing_KEEP')

    h.flash.value = {}
    await wrapper.setProps({ instruments: tab({ source: source({ hasIngestToken: true }) }) })
    expect(wrapper.find('[data-testid="base-code-block"]').text()).toContain('fai_ing_KEEP')
    wrapper.unmount()
  })
})
