import { test } from '@japa/runner'
import { BUILTIN_ALERT_RULES } from '#shared/constants/instrument_alerts'
import { INSTRUMENT_PATH_CATALOG, matchesCatalogPattern } from '#shared/constants/instruments'
import {
  alertOpenKey,
  alertRuleSpecs,
  decideAlarm,
  decideThreshold,
  displayToSi,
  evaluateAlerts,
  hysteresisToSi,
  readAlarm,
} from '#shared/helpers/instrument_alerts'
import { toDisplayUnit } from '../../../inertia/lib/signalk/units.js'
import type { InstrumentAlertRuleSpec } from '#shared/types/instruments'

const lowBattery: InstrumentAlertRuleSpec = {
  key: 'rule:1',
  pathPattern: 'electrical.batteries.house.voltage',
  kind: 'threshold',
  operator: 'lt',
  threshold: 12,
  hysteresis: 0.5,
  severity: 'warning',
}

test.group('decideThreshold — hystérésis (#993)', () => {
  test('sous le seuil : ouvre ; au-dessus : rien', ({ assert }) => {
    assert.equal(decideThreshold(lowBattery, 11.9, false), 'open')
    assert.equal(decideThreshold(lowBattery, 12, false), 'none')
    assert.equal(decideThreshold(lowBattery, 13, false), 'none')
  })

  test('ouverte, elle se maintient dans la marge puis se lève au-delà', ({ assert }) => {
    assert.equal(decideThreshold(lowBattery, 11, true), 'keep')
    assert.equal(decideThreshold(lowBattery, 12.2, true), 'keep')
    assert.equal(decideThreshold(lowBattery, 12.5, true), 'clear')
    assert.equal(decideThreshold(lowBattery, 14, true), 'clear')
  })

  test('opérateur gt : miroir de lt', ({ assert }) => {
    const hot = { operator: 'gt' as const, threshold: 90, hysteresis: 5 }
    assert.equal(decideThreshold(hot, 91, false), 'open')
    assert.equal(decideThreshold(hot, 90, false), 'none')
    assert.equal(decideThreshold(hot, 87, true), 'keep')
    assert.equal(decideThreshold(hot, 85, true), 'clear')
  })

  test('sans marge, le seuil lui-même lève', ({ assert }) => {
    const rule = { operator: 'lt' as const, threshold: 10, hysteresis: 0 }
    assert.equal(decideThreshold(rule, 10, true), 'clear')
  })
})

test.group('alarmes Signal K (#993)', () => {
  test('readAlarm lit state et message, rejette les formes inattendues', ({ assert }) => {
    assert.deepEqual(readAlarm({ state: 'alarm', message: 'Low oil' }), {
      state: 'alarm',
      message: 'Low oil',
    })
    assert.deepEqual(readAlarm({ state: 'warn' }), { state: 'warn', message: null })
    assert.isNull(readAlarm(null))
    assert.isNull(readAlarm('alarm'))
    assert.isNull(readAlarm([1]))
    assert.isNull(readAlarm({ message: 'sans état' }))
  })

  test('alarm et emergency ouvrent ; normal et warn ne font rien', ({ assert }) => {
    assert.equal(decideAlarm({ state: 'alarm' }, false), 'open')
    assert.equal(decideAlarm({ state: 'emergency' }, false), 'open')
    assert.equal(decideAlarm({ state: 'warn' }, false), 'none')
    assert.equal(decideAlarm({ state: 'normal' }, false), 'none')
    assert.equal(decideAlarm(null, false), 'none')
  })

  test('ouverte : maintenue tant qu’elle sonne, levée au retour à la normale', ({ assert }) => {
    assert.equal(decideAlarm({ state: 'alarm' }, true), 'keep')
    assert.equal(decideAlarm({ state: 'normal' }, true), 'clear')
  })
})

test.group('evaluateAlerts (#993)', () => {
  const voltage = (value: number | null) => ({
    path: 'electrical.batteries.house.voltage',
    value,
    valueJson: null,
  })

  test('applique la règle au chemin qui correspond seulement', ({ assert }) => {
    const transitions = evaluateAlerts({
      rules: [lowBattery],
      samples: [
        voltage(11),
        { path: 'electrical.batteries.start.voltage', value: 11, valueJson: null },
      ],
      open: new Set(),
    })
    assert.lengthOf(transitions, 1)
    assert.deepInclude(transitions[0], { ruleKey: 'rule:1', decision: 'open', value: 11 })
  })

  test('connaît les alertes ouvertes par règle et par chemin', ({ assert }) => {
    const open = new Set([alertOpenKey('rule:1', 'electrical.batteries.house.voltage')])
    const kept = evaluateAlerts({ rules: [lowBattery], samples: [voltage(11.5)], open })
    assert.equal(kept[0].decision, 'keep')
    const cleared = evaluateAlerts({ rules: [lowBattery], samples: [voltage(13)], open })
    assert.equal(cleared[0].decision, 'clear')
    assert.isEmpty(evaluateAlerts({ rules: [lowBattery], samples: [voltage(13)], open: new Set() }))
  })

  test('ignore une valeur numérique absente ou non finie', ({ assert }) => {
    assert.isEmpty(
      evaluateAlerts({
        rules: [lowBattery],
        samples: [voltage(null), voltage(Number.NaN)],
        open: new Set(),
      })
    )
  })

  test('les règles intégrées couvrent batterie, moteur, petit fond et alarmes', ({ assert }) => {
    const transitions = evaluateAlerts({
      rules: BUILTIN_ALERT_RULES,
      samples: [
        { path: 'electrical.batteries.house.capacity.stateOfCharge', value: 0.1, valueJson: null },
        { path: 'propulsion.port.coolantTemperature', value: 375, valueJson: null },
        { path: 'environment.depth.belowKeel', value: 1, valueJson: null },
        {
          path: 'notifications.navigation.anchor',
          value: null,
          valueJson: { state: 'alarm', message: 'Anchor drag' },
        },
        { path: 'environment.depth.belowKeel', value: 5, valueJson: null },
      ],
      open: new Set(),
    })
    assert.sameMembers(
      transitions.map((t) => t.ruleKey),
      [
        'builtin:battery_low',
        'builtin:engine_hot',
        'builtin:shallow_water',
        'builtin:signalk_alarm',
      ]
    )
    const alarm = transitions.find((t) => t.ruleKey === 'builtin:signalk_alarm')!
    assert.equal(alarm.message, 'Anchor drag')
    assert.equal(alarm.severity, 'critical')
  })

  test('le message retombe sur l’état quand l’alarme n’en porte pas', ({ assert }) => {
    const [transition] = evaluateAlerts({
      rules: BUILTIN_ALERT_RULES,
      samples: [{ path: 'notifications.fire', value: null, valueJson: { state: 'emergency' } }],
      open: new Set(),
    })
    assert.equal(transition.message, 'emergency')
  })

  test('alertRuleSpecs ajoute les règles actives aux règles intégrées', ({ assert }) => {
    const specs = alertRuleSpecs([
      {
        id: 4,
        path: 'a.b',
        operator: 'gt',
        threshold: 1,
        hysteresis: 0,
        severity: 'critical',
        enabled: true,
      },
      {
        id: 5,
        path: 'c.d',
        operator: 'lt',
        threshold: 1,
        hysteresis: 0,
        severity: 'warning',
        enabled: false,
      },
    ])
    assert.lengthOf(specs, BUILTIN_ALERT_RULES.length + 1)
    assert.equal(specs.at(-1)!.key, 'rule:4')
  })
})

test.group('conversion d’unités des règles (#993)', () => {
  test('displayToSi est l’inverse de toDisplayUnit pour chaque unité du catalogue', ({
    assert,
  }) => {
    const units = new Set(
      INSTRUMENT_PATH_CATALOG.map((spec) => spec.displayUnit).filter((u): u is string => u !== null)
    )
    for (const unit of units) {
      if (unit === '°') continue // ramené dans [0, 360[ à l'affichage : non inversible
      const display = 37.5
      assert.closeTo(toDisplayUnit(unit, displayToSi(unit, display)), display, 1e-9, unit)
    }
  })

  test('une unité inconnue ou nulle passe telle quelle', ({ assert }) => {
    assert.equal(displayToSi(null, 3), 3)
    assert.equal(displayToSi('furlong', 3), 3)
  })

  test('°C : 90 °C = 363,15 K', ({ assert }) => {
    assert.closeTo(displayToSi('°C', 90), 363.15, 1e-9)
  })

  test('la marge est un écart, sans le décalage du kelvin', ({ assert }) => {
    assert.closeTo(hysteresisToSi('°C', 90, 5), 5, 1e-9)
    assert.closeTo(hysteresisToSi('%', 20, 5), 0.05, 1e-9)
    assert.equal(hysteresisToSi('°C', 90, 0), 0)
  })

  test('matchesCatalogPattern : <id> vaut un segment, chemin concret = égalité', ({ assert }) => {
    assert.isTrue(
      matchesCatalogPattern('propulsion.<id>.temperature', 'propulsion.port.temperature')
    )
    assert.isFalse(
      matchesCatalogPattern('propulsion.<id>.temperature', 'propulsion.a.b.temperature')
    )
    assert.isTrue(matchesCatalogPattern('a.b', 'a.b'))
    assert.isFalse(matchesCatalogPattern('a.b', 'axb'))
  })
})
