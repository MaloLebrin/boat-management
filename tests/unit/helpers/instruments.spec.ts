import { test } from '@japa/runner'
import { normalizeInstrumentBaseUrl } from '#shared/helpers/instruments'
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

  test('refuse le reste', ({ assert }) => {
    for (const path of [
      '',
      'navigation',
      'propulsion.port.runTime.extra',
      'propulsion..runTime',
      'electrical.batteries.house.unknown',
      'design.length',
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
