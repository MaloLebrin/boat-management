import { test } from '@japa/runner'
import {
  normalizeInstrumentBaseUrl,
  signalkPluginInstallCommand,
} from '#shared/helpers/instruments'
import { isAllowedTelemetryPath, telemetryPathSpec } from '#shared/constants/instruments'

test.group('normalizeInstrumentBaseUrl (#988)', () => {
  test('accepte une origine http(s) avec ou sans port', ({ assert }) => {
    assert.equal(normalizeInstrumentBaseUrl('https://sk.local:3443'), 'https://sk.local:3443')
    assert.equal(
      normalizeInstrumentBaseUrl(' http://192.168.1.20:3000/ '),
      'http://192.168.1.20:3000'
    )
    assert.equal(normalizeInstrumentBaseUrl('https://sk.local:443'), 'https://sk.local')
  })

  for (const bad of [
    '',
    'sk.local:3000',
    'ftp://sk.local',
    'ws://sk.local',
    'https://user:pw@sk.local',
    'https://sk.local/signalk',
    'https://sk.local?x=1',
    'https://sk.local#frag',
    'https://sk.local; script-src *',
    "https://sk.local 'unsafe-inline'",
  ]) {
    test(`refuse « ${bad} »`, ({ assert }) => {
      assert.isNull(normalizeInstrumentBaseUrl(bad))
    })
  }
})

test.group('INSTRUMENT_PATH_CATALOG (#988)', () => {
  test('accepte les motifs paramétrés', ({ assert }) => {
    for (const path of [
      'propulsion.port.runTime',
      'propulsion.0.revolutions',
      'electrical.batteries.house.capacity.stateOfCharge',
      'tanks.freshWater.0.currentLevel',
      'environment.depth.belowKeel',
      'navigation.position',
      'notifications.electrical.batteries.house.lowVoltage',
    ]) {
      assert.isTrue(isAllowedTelemetryPath(path), path)
    }
  })

  test('accepte les mesures de la spécification Signal K ajoutées en #1006', ({ assert }) => {
    for (const path of [
      'propulsion.port.oilTemperature',
      'propulsion.0.exhaustTemperature',
      'propulsion.port.coolantPressure',
      'propulsion.port.boostPressure',
      'propulsion.port.engineLoad',
      'propulsion.port.alternatorVoltage',
      'navigation.log',
      'navigation.trip.log',
      'electrical.batteries.house.capacity.timeRemaining',
      'electrical.batteries.house.capacity.stateOfHealth',
      'electrical.solar.0.panelVoltage',
      'electrical.solar.0.panelCurrent',
      'electrical.solar.0.current',
      'electrical.chargers.main.voltage',
      'electrical.chargers.main.current',
      'electrical.inverters.0.dc.voltage',
      'electrical.inverters.0.dc.current',
      'electrical.inverters.0.ac.realPower',
      'tanks.fuel.0.currentVolume',
      'environment.wind.speedOverGround',
      'environment.wind.angleTrueGround',
      'environment.wind.directionMagnetic',
      'environment.outside.relativeHumidity',
      'environment.inside.temperature',
      'environment.inside.relativeHumidity',
      'environment.inside.refrigerator.temperature',
      'environment.inside.engineRoom.relativeHumidity',
      'environment.tide.heightNow',
    ]) {
      assert.isTrue(isAllowedTelemetryPath(path), path)
      assert.equal(telemetryPathSpec(path)?.valueKind, 'number', path)
    }
  })

  test('une zone intérieure ne se confond pas avec la mesure sans zone', ({ assert }) => {
    assert.equal(
      telemetryPathSpec('environment.inside.temperature')?.pattern,
      'environment.inside.temperature'
    )
    assert.equal(
      telemetryPathSpec('environment.inside.refrigerator.temperature')?.pattern,
      'environment.inside.<zone>.temperature'
    )
    assert.isFalse(isAllowedTelemetryPath('environment.inside.a.b.temperature'))
  })

  test('refuse le reste', ({ assert }) => {
    for (const path of [
      '',
      'navigation',
      'propulsion.port.runTime.extra',
      'propulsion..runTime',
      'electrical.batteries.house.unknown',
      'design.length',
      'electrical.solar.0.unknown',
      'environment.inside.refrigerator.pressure',
      'navigation.trip.lastReset',
      'x'.repeat(97),
      'notifications.',
    ]) {
      assert.isFalse(isAllowedTelemetryPath(path), path)
    }
  })

  test('distingue numérique et structuré', ({ assert }) => {
    assert.equal(telemetryPathSpec('navigation.position')?.valueKind, 'json')
    assert.equal(telemetryPathSpec('navigation.speedOverGround')?.valueKind, 'number')
  })
})

test.group('signalkPluginInstallCommand (#1021)', () => {
  test('compose la commande curl | bash avec le jeton', ({ assert }) => {
    assert.equal(
      signalkPluginInstallCommand('https://fleetai.app', 'fai_ing_abc'),
      'curl -fsSL https://fleetai.app/install/signalk-plugin.sh | FLEETAI_TOKEN=fai_ing_abc bash'
    )
  })

  test('sans jeton : emplacement à remplacer, et sans / final en double', ({ assert }) => {
    assert.equal(
      signalkPluginInstallCommand('http://localhost:3333/', null),
      'curl -fsSL http://localhost:3333/install/signalk-plugin.sh | FLEETAI_TOKEN=fai_ing_… bash'
    )
  })
})
