import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const { put, del } = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }))
const post = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', async () => {
  const { reactive } = await import('vue')
  return {
    router: { put, delete: del },
    useForm: (initial: Record<string, unknown>) => {
      const form = reactive({
        ...initial,
        errors: {},
        processing: false,
        transform(fn: (data: Record<string, unknown>) => unknown) {
          ;(form as any)._transform = fn
          return form
        },
        post(url: string, options: unknown) {
          const data = (form as any)._transform
            ? (form as any)._transform({ ...initial, ...form })
            : form
          post(url, data, options)
        },
        reset() {},
      })
      return form
    },
    usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
  }
})

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDateTime: () => 'dt' }),
}))

import InstrumentAlertRulesEditor from '../../inertia/components/boats/show/tabs/instruments/InstrumentAlertRulesEditor.vue'
import InstrumentAlertsList from '../../inertia/components/boats/show/tabs/instruments/InstrumentAlertsList.vue'
import { instrumentAlertLabel } from '../../inertia/utils/instrument_alert_label'
import { mergeInstrumentAlerts } from '../../inertia/utils/instrument_alerts'
import type { InstrumentAlertRuleRow, InstrumentAlertRow } from '../../shared/types/instruments'

const SOC = 'electrical.batteries.house.capacity.stateOfCharge'

const serverAlert = (over: Partial<InstrumentAlertRow> = {}): InstrumentAlertRow => ({
  id: 1,
  ruleKey: 'builtin:battery_low',
  path: SOC,
  severity: 'warning',
  openedAt: '2026-10-22T08:00:00.000Z',
  clearedAt: null,
  lastValue: 0.12,
  message: null,
  ...over,
})

beforeEach(() => {
  put.mockClear()
  del.mockClear()
  post.mockClear()
})

describe('mergeInstrumentAlerts (#993)', () => {
  test('le serveur fait foi : une alerte connue des deux côtés n’apparaît qu’une fois', () => {
    const merged = mergeInstrumentAlerts([serverAlert()], {
      [`builtin:battery_low|${SOC}`]: {
        key: `builtin:battery_low|${SOC}`,
        ruleKey: 'builtin:battery_low',
        path: SOC,
        severity: 'warning',
        openedAt: 1,
        value: 0.1,
        message: null,
      },
    })
    expect(merged).toHaveLength(1)
    expect(merged[0].local).toBe(false)
    expect(merged[0].value).toBe(0.12)
  })

  test('ajoute les alertes détectées à bord, la plus récente d’abord', () => {
    const merged = mergeInstrumentAlerts([serverAlert()], {
      'builtin:shallow_water|environment.depth.belowKeel': {
        key: 'builtin:shallow_water|environment.depth.belowKeel',
        ruleKey: 'builtin:shallow_water',
        path: 'environment.depth.belowKeel',
        severity: 'critical',
        openedAt: Date.parse('2026-10-22T09:00:00.000Z'),
        value: 1,
        message: null,
      },
    })
    expect(merged.map((alert) => alert.ruleKey)).toEqual([
      'builtin:shallow_water',
      'builtin:battery_low',
    ])
    expect(merged[0].local).toBe(true)
  })

  test('sans alerte, liste vide', () => {
    expect(mergeInstrumentAlerts([], {})).toEqual([])
  })
})

describe('instrumentAlertLabel (#993)', () => {
  const t = (key: string) => `T:${key}`
  test('règle intégrée : son libellé traduit', () => {
    expect(instrumentAlertLabel(t, 'builtin:engine_hot', 'x')).toBe(
      'T:instruments.alerts.builtin.engine_hot'
    )
  })
  test('règle de l’admin : le chemin', () => {
    expect(instrumentAlertLabel(t, 'rule:3', 'propulsion.port.temperature')).toBe(
      'propulsion.port.temperature'
    )
  })
})

describe('InstrumentAlertsList (#993)', () => {
  test('annonce l’absence d’alerte', () => {
    const wrapper = mount(InstrumentAlertsList, { props: { alerts: [] } })
    expect(wrapper.text()).toContain('instruments.alerts.none')
  })

  test('liste gravité, libellé, valeur convertie et origine locale', () => {
    const alerts = mergeInstrumentAlerts([serverAlert()], {
      'builtin:engine_hot|propulsion.port.coolantTemperature': {
        key: 'builtin:engine_hot|propulsion.port.coolantTemperature',
        ruleKey: 'builtin:engine_hot',
        path: 'propulsion.port.coolantTemperature',
        severity: 'critical',
        openedAt: Date.parse('2026-10-22T09:00:00.000Z'),
        value: 373.15,
        message: null,
      },
    })
    const wrapper = mount(InstrumentAlertsList, { props: { alerts } })
    const items = wrapper.findAll('[data-testid="instrument-alert"]')

    expect(items).toHaveLength(2)
    expect(items[0].attributes('data-severity')).toBe('critical')
    expect(items[0].text()).toContain('instruments.alerts.builtin.engine_hot')
    expect(items[0].text()).toContain('100 °C')
    expect(items[0].text()).toContain('instruments.alerts.local')
    expect(items[1].text()).toContain('12 %')
    expect(items[1].text()).not.toContain('instruments.alerts.local')
  })

  test('une alarme Signal K affiche son message', () => {
    const alerts = mergeInstrumentAlerts(
      [
        serverAlert({
          ruleKey: 'builtin:signalk_alarm',
          path: 'notifications.navigation.anchor',
          lastValue: null,
          message: 'Anchor drag',
        }),
      ],
      {}
    )
    const wrapper = mount(InstrumentAlertsList, { props: { alerts } })
    expect(wrapper.text()).toContain('Anchor drag')
  })
})

describe('InstrumentAlertRulesEditor (#993)', () => {
  const rule: InstrumentAlertRuleRow = {
    id: 7,
    path: 'propulsion.port.temperature',
    operator: 'gt',
    threshold: 368.15,
    hysteresis: 5,
    severity: 'critical',
    enabled: true,
  }
  const paths = [{ value: 'propulsion.port.temperature', label: 'Température · port' }]

  test('affiche la règle dans l’unité d’affichage', () => {
    const wrapper = mount(InstrumentAlertRulesEditor, {
      props: { boatId: 3, rules: [rule], paths },
    })
    const text = wrapper.find('[data-testid="instrument-alert-rule"]').text()
    expect(text).toContain('"threshold":"95"')
    expect(text).toContain('"unit":"°C"')
  })

  test('sans règle, l’indique', () => {
    const wrapper = mount(InstrumentAlertRulesEditor, { props: { boatId: 3, rules: [], paths } })
    expect(wrapper.text()).toContain('instruments.alerts.editor.empty')
  })

  test('supprimer envoie un DELETE sur la règle', async () => {
    const wrapper = mount(InstrumentAlertRulesEditor, {
      props: { boatId: 3, rules: [rule], paths },
    })
    const button = wrapper
      .findAll('button')
      .find((b) => b.text() === 'instruments.alerts.editor.delete')!
    await button.trigger('click')
    expect(del).toHaveBeenCalledWith('/boats/3/instrument-alert-rules/7', { preserveScroll: true })
  })

  test('désactiver renvoie la règle complète, seuil et marge en unité d’affichage', async () => {
    const wrapper = mount(InstrumentAlertRulesEditor, {
      props: { boatId: 3, rules: [rule], paths },
    })
    await wrapper.find('[role="switch"]').trigger('click')

    expect(put).toHaveBeenCalledTimes(1)
    const [url, payload] = put.mock.calls[0]
    expect(url).toBe('/boats/3/instrument-alert-rules/7')
    expect(payload).toMatchObject({
      path: 'propulsion.port.temperature',
      operator: 'gt',
      severity: 'critical',
      threshold: 95,
      hysteresis: 5,
      enabled: false,
    })
  })

  test('le formulaire envoie des nombres, sans marge si elle est vide', async () => {
    const wrapper = mount(InstrumentAlertRulesEditor, { props: { boatId: 3, rules: [], paths } })
    await wrapper.find('select[name="path"]').setValue('propulsion.port.temperature')
    await wrapper.find('input[name="threshold"]').setValue('90')
    await wrapper.find('form').trigger('submit')

    expect(post).toHaveBeenCalledTimes(1)
    const [url, data] = post.mock.calls[0]
    expect(url).toBe('/boats/3/instrument-alert-rules')
    expect(data).toMatchObject({
      path: 'propulsion.port.temperature',
      operator: 'lt',
      threshold: 90,
      severity: 'warning',
    })
    expect(data).not.toHaveProperty('hysteresis')
  })

  test('au plafond de règles, le formulaire disparaît', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({ ...rule, id: index + 1 }))
    const wrapper = mount(InstrumentAlertRulesEditor, {
      props: { boatId: 3, rules: many, paths },
    })
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('instruments.alerts.editor.limit')
  })
})

describe('libellés des règles intégrées (#1005)', () => {
  test.each(['en', 'fr'])('chaque règle intégrée a un libellé %s', async (locale) => {
    const { BUILTIN_ALERT_RULES } = await import('../../shared/constants/instrument_alerts')
    const module = await import(`../../resources/lang/${locale}/instruments.json`)
    const json = module.default as { alerts: { builtin: Record<string, string> } }
    for (const rule of BUILTIN_ALERT_RULES) {
      expect(json.alerts.builtin[rule.key.slice('builtin:'.length)]).toBeTruthy()
    }
  })
})
