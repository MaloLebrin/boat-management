import { flushPromises, mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import type { InstrumentsTabProps } from '../../shared/types/instruments'

const { put, destroy, transformFn } = vi.hoisted(() => ({
  put: vi.fn(),
  destroy: vi.fn(),
  transformFn: { current: null as null | ((data: any) => unknown) },
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: (initial: Record<string, unknown>) => {
    const form: any = {
      ...initial,
      errors: {},
      processing: false,
      reset: vi.fn(),
      transform(fn: (data: any) => unknown) {
        transformFn.current = fn
        return form
      },
      put: (url: string, options: unknown) => put(url, transformFn.current?.(form), options),
    }
    return form
  },
  router: { delete: destroy, post: vi.fn() },
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
    locale: ref('fr'),
  }),
}))

const streamState = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  latest: { value: {} as Record<string, unknown> },
}))
vi.mock('~/composables/use_instrument_stream', () => ({
  useInstrumentStream: () => ({
    connectionState: { value: 'open' },
    errorKey: { value: null },
    latestByPath: streamState.latest,
    lastDeltaAt: { value: null },
    localAlerts: { value: {} },
    staleSince: { value: {} },
    start: streamState.start,
    stop: streamState.stop,
  }),
}))
const syncState = vi.hoisted(() => ({
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('~/composables/use_telemetry_sync', () => ({
  useTelemetrySync: () => ({ ...syncState, push: vi.fn() }),
}))

import BoatShowTabInstruments from '../../inertia/components/boats/show/tabs/BoatShowTabInstruments.vue'
import InstrumentAlarmsList from '../../inertia/components/boats/show/tabs/instruments/InstrumentAlarmsList.vue'
import InstrumentConnectionBanner from '../../inertia/components/boats/show/tabs/instruments/InstrumentConnectionBanner.vue'
import InstrumentGauge from '../../inertia/components/boats/show/tabs/instruments/InstrumentGauge.vue'
import InstrumentSourceForm from '../../inertia/components/boats/show/tabs/instruments/InstrumentSourceForm.vue'
import { buildReadings, catalogLabelKeys, toReading } from '../../inertia/lib/signalk/display'
import { passagePages } from '../../inertia/lib/passage_preparation'

const NOW = Date.parse('2026-10-19T10:00:00Z')

const source = {
  id: 4,
  boatId: 9,
  kind: 'signalk' as const,
  baseUrl: 'https://sk.local:3443',
  vesselContext: 'vessels.self',
  enabled: true,
  hasToken: true,
  lastSeenAt: '2026-10-19T09:00:00Z',
  lastError: null,
  token: 'tok',
}

function props(overrides: Partial<InstrumentsTabProps> = {}): InstrumentsTabProps {
  return {
    source,
    latest: [
      {
        path: 'navigation.speedOverGround',
        recordedAt: '2026-10-19T09:59:00Z',
        value: 2.5722,
        valueJson: null,
      },
      {
        path: 'propulsion.port.revolutions',
        recordedAt: '2026-10-19T09:40:00Z',
        value: 25,
        valueJson: null,
      },
      {
        path: 'tanks.fuel.0.currentLevel',
        recordedAt: '2026-10-19T09:59:00Z',
        value: 0.625,
        valueJson: null,
      },
    ],
    recent: {},
    rules: [],
    openAlerts: [],
    can: { manage: true, ingest: true },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  streamState.latest.value = {}
})

describe('lectures (display.ts)', () => {
  test('SI → affichage, libellé et instance', () => {
    const speed = toReading('navigation.speedOverGround', {
      value: 2.5722,
      valueJson: null,
      at: NOW,
      live: false,
    })
    expect(speed?.value).toBeCloseTo(5, 1)
    expect(speed?.displayUnit).toBe('kn')

    const revs = toReading('propulsion.port.revolutions', {
      value: 25,
      valueJson: null,
      at: NOW,
      live: false,
    })
    expect(revs).toMatchObject({
      value: 1500,
      displayUnit: 'rpm',
      instance: 'port',
      labelKey: 'instruments.path.propulsion_revolutions',
    })

    const tank = toReading('tanks.fuel.0.currentLevel', {
      value: 0.625,
      valueJson: null,
      at: NOW,
      live: false,
    })
    expect(tank).toMatchObject({ value: 62.5, instance: 'fuel · 0' })
  })

  test('le direct remplace la valeur connue du serveur', () => {
    const readings = buildReadings(props().latest, {
      'navigation.speedOverGround': { value: 5.1444, valueJson: null, receivedAt: NOW },
    })
    const speed = readings.find((r) => r.path === 'navigation.speedOverGround')
    expect(speed?.live).toBe(true)
    expect(speed?.value).toBeCloseTo(10, 1)
    expect(readings.find((r) => r.path === 'propulsion.port.revolutions')?.live).toBe(false)
  })

  test('un chemin hors catalogue est ignoré, les catégories sont ordonnées', () => {
    const readings = buildReadings(
      [
        { path: 'design.length', recordedAt: '2026-10-19T09:00:00Z', value: 12, valueJson: null },
        ...props().latest,
      ],
      {}
    )
    expect(readings.map((r) => r.category)).toEqual(['propulsion', 'navigation', 'tanks'])
  })

  test('chaque motif du catalogue a son libellé en français et en anglais', () => {
    for (const locale of ['en', 'fr']) {
      const file = JSON.parse(
        readFileSync(`resources/lang/${locale}/instruments.json`, 'utf8')
      ) as {
        path: Record<string, string>
      }
      for (const key of catalogLabelKeys()) {
        expect(file.path[key.replace('instruments.path.', '')], `${locale} ${key}`).toBeTruthy()
      }
    }
  })
})

describe('InstrumentGauge', () => {
  const reading = (value: number, at: number, live = false) =>
    toReading('environment.depth.belowKeel', { value, valueJson: null, at, live })!

  test('valeur, unité et « dernière valeur connue » hors direct', () => {
    const wrapper = mount(InstrumentGauge, {
      props: { reading: reading(4.26, NOW - 5000), now: NOW },
    })
    expect(wrapper.text()).toContain('4,3')
    expect(wrapper.text()).toContain('instruments.gauge.lastKnown')
    expect(wrapper.text()).not.toContain('instruments.gauge.stale')
  })

  test('badge périmé au-delà de deux minutes', () => {
    const wrapper = mount(InstrumentGauge, {
      props: { reading: reading(4, NOW - 180_000), now: NOW },
    })
    expect(wrapper.text()).toContain('instruments.gauge.stale')
  })

  test('en direct : pas de date', () => {
    const wrapper = mount(InstrumentGauge, { props: { reading: reading(4, NOW, true), now: NOW } })
    expect(wrapper.text()).toContain('instruments.gauge.live')
  })

  test('position formatée', () => {
    const position = toReading('navigation.position', {
      value: null,
      valueJson: { latitude: 43.2965, longitude: -5.3698 },
      at: NOW,
      live: true,
    })!
    const wrapper = mount(InstrumentGauge, { props: { reading: position, now: NOW } })
    expect(wrapper.text()).toContain('43,2965° N')
    expect(wrapper.text()).toContain('5,3698° W')
  })
})

describe('InstrumentAlarmsList', () => {
  const alarm = (path: string, state: string, message: string | null) =>
    toReading(path, {
      value: null,
      valueJson: { state, message, method: [] },
      at: NOW,
      live: true,
    })!

  test('aucune alarme active', () => {
    const wrapper = mount(InstrumentAlarmsList, {
      props: { readings: [alarm('notifications.a.b', 'normal', null)] },
    })
    expect(wrapper.text()).toContain('instruments.alarms.none')
  })

  test('les plus graves d’abord, les normales masquées', () => {
    const wrapper = mount(InstrumentAlarmsList, {
      props: {
        readings: [
          alarm('notifications.a.warn', 'warn', 'Tension basse'),
          alarm('notifications.a.ok', 'normal', 'RAS'),
          alarm('notifications.a.emergency', 'emergency', 'Voie d’eau'),
        ],
      },
    })
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Voie d’eau')
    expect(items[1].text()).toContain('Tension basse')
  })
})

describe('InstrumentConnectionBanner', () => {
  const base = {
    state: 'open',
    errorKey: null,
    lastDeltaAt: null,
    readOnly: false,
    enabled: true,
    lastSeenAt: null,
  } as const

  test('connecté : annonce que la collecte dure tant que l’écran est ouvert', () => {
    const text = mount(InstrumentConnectionBanner, { props: { ...base } }).text()
    expect(text).toContain('instruments.banner.state.open')
    expect(text).toContain('instruments.banner.screenOpen')
  })

  test('jeton requis', () => {
    const text = mount(InstrumentConnectionBanner, {
      props: { ...base, state: 'error', errorKey: 'unauthorized' },
    }).text()
    expect(text).toContain('instruments.banner.error.unauthorized')
  })

  test('lecteur sans droit d’ingérer ou source désactivée : pas d’état de flux', () => {
    const readOnly = mount(InstrumentConnectionBanner, {
      props: { ...base, readOnly: true },
    }).text()
    expect(readOnly).toContain('instruments.banner.readOnly')
    expect(readOnly).not.toContain('screenOpen')
    const disabled = mount(InstrumentConnectionBanner, {
      props: { ...base, enabled: false },
    }).text()
    expect(disabled).toContain('instruments.banner.disabled')
  })
})

describe('InstrumentSourceForm', () => {
  const mountForm = (src = source) =>
    mount(InstrumentSourceForm, { props: { boatId: 9, source: src } })

  test('le jeton n’est jamais pré-rempli, l’indice dit qu’un jeton existe', () => {
    const wrapper = mountForm()
    expect((wrapper.find('input[name="token"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.text()).toContain('instruments.form.tokenSet')
  })

  test('PUT sans jeton saisi : le jeton n’est pas envoyé (conservé)', async () => {
    await mountForm().find('form').trigger('submit')
    expect(put).toHaveBeenCalledWith(
      '/boats/9/instrument-source',
      { baseUrl: 'https://sk.local:3443', vesselContext: 'vessels.self', enabled: true },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('jeton saisi : remplacé', async () => {
    const wrapper = mountForm()
    await wrapper.find('input[name="token"]').setValue('nouveau')
    await wrapper.find('form').trigger('submit')
    expect(put.mock.calls[0][1]).toMatchObject({ token: 'nouveau' })
  })

  test('retirer demande confirmation puis supprime', async () => {
    const wrapper = mount(InstrumentSourceForm, {
      props: { boatId: 9, source },
      attachTo: document.body,
    })
    const remove = wrapper.findAll('button').find((b) => b.text() === 'instruments.form.remove')!
    await remove.trigger('click')
    expect(destroy).not.toHaveBeenCalled()

    // La modale est téléportée hors du composant.
    const confirm = [...document.body.querySelectorAll('button')]
      .filter((b) => b.textContent?.trim() === 'instruments.form.remove')
      .at(-1)!
    confirm.click()
    await flushPromises()
    expect(destroy).toHaveBeenCalledWith('/boats/9/instrument-source', { preserveScroll: true })
    wrapper.unmount()
  })

  test('sans source : pas de bouton de retrait ni d’indice de jeton', () => {
    const wrapper = mountForm(null as never)
    expect(wrapper.text()).not.toContain('instruments.form.remove')
    expect(wrapper.text()).not.toContain('instruments.form.tokenSet')
  })
})

describe('BoatShowTabInstruments', () => {
  const mountTab = (value: InstrumentsTabProps) =>
    mount(BoatShowTabInstruments, { props: { boatId: 9, instruments: value } })

  test('un admin voit les jauges, les alarmes, le formulaire et lance le flux', async () => {
    const wrapper = mountTab(props())
    await flushPromises()

    expect(wrapper.findAll('[data-testid="instrument-gauge"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="instrument-alarms"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="instrument-source-form"]').exists()).toBe(true)
    expect(syncState.start).toHaveBeenCalled()
    expect(streamState.start).toHaveBeenCalled()
  })

  test('sans droit d’ingérer : dernières valeurs, pas de flux, pas de formulaire', async () => {
    const wrapper = mountTab(
      props({ source: { ...source, token: null }, can: { manage: false, ingest: false } })
    )
    await flushPromises()

    expect(wrapper.findAll('[data-testid="instrument-gauge"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="instrument-source-form"]').exists()).toBe(false)
    expect(streamState.start).not.toHaveBeenCalled()
  })

  test('source désactivée : pas de flux', async () => {
    mountTab(props({ source: { ...source, enabled: false } }))
    await flushPromises()
    expect(streamState.start).not.toHaveBeenCalled()
  })

  test('sans source : état vide, formulaire pour l’admin seulement', async () => {
    const admin = mountTab(props({ source: null, latest: [] }))
    expect(admin.text()).toContain('instruments.empty.manage')
    expect(admin.find('[data-testid="instrument-source-form"]').exists()).toBe(true)

    const member = mountTab(
      props({ source: null, latest: [], can: { manage: false, ingest: true } })
    )
    expect(member.text()).toContain('instruments.empty.readOnly')
    expect(member.find('[data-testid="instrument-source-form"]').exists()).toBe(false)
  })

  test('source sans aucune mesure : message d’attente', async () => {
    const wrapper = mountTab(props({ latest: [] }))
    expect(wrapper.text()).toContain('instruments.noData')
  })

  test('alertes ouvertes et éditeur de règles pour l’admin (#993)', async () => {
    const wrapper = mountTab(
      props({
        openAlerts: [
          {
            id: 1,
            ruleKey: 'builtin:battery_low',
            path: 'electrical.batteries.house.capacity.stateOfCharge',
            severity: 'warning',
            openedAt: '2026-10-19T09:00:00Z',
            clearedAt: null,
            lastValue: 0.1,
            message: null,
          },
        ],
      })
    )
    await flushPromises()

    expect(wrapper.findAll('[data-testid="instrument-alert"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="instrument-alert-rules"]').exists()).toBe(true)
  })

  test('sans droit de gestion ou sans source : pas d’éditeur de règles (#993)', async () => {
    const reader = mountTab(props({ can: { manage: false, ingest: true } }))
    await flushPromises()
    expect(reader.find('[data-testid="instrument-alert-rules"]').exists()).toBe(false)
    expect(reader.find('[data-testid="instrument-alerts"]').exists()).toBe(true)

    const noSource = mountTab(props({ source: null, latest: [] }))
    expect(noSource.find('[data-testid="instrument-alert-rules"]').exists()).toBe(false)
  })
})

describe('passagePages — instruments (#990)', () => {
  test('absent par défaut, ajouté avant le planning quand le plan l’ouvre', () => {
    expect(passagePages(7).map((p) => p.url)).not.toContain('/boats/7?tab=instruments')
    const urls = passagePages(7, [], { instruments: true }).map((p) => p.url)
    expect(urls.indexOf('/boats/7?tab=instruments')).toBe(urls.indexOf('/planning') - 1)
  })
})
