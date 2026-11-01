import { test } from '@japa/runner'
import {
  proposeInstrumentMapping,
  type MappingDevice,
  type MappingInput,
} from '#services/instrument_mapping_service'

/** Traducteur de test : restitue la clé et ses paramètres, sans dépendre des fichiers de langue. */
const translate: MappingInput['translate'] = (key, params) => {
  const short = key.replace('instruments.mapping.names.', '')
  return params ? `${short}:${Object.values(params).join(',')}` : short
}

function device(paths: string[], overrides: Partial<MappingDevice> = {}): MappingDevice {
  return { label: 'Appareil', manufacturer: null, model: null, paths, goneAt: null, ...overrides }
}

function run(partial: Partial<MappingInput>) {
  return proposeInstrumentMapping({
    devices: [],
    engines: [],
    batteries: [],
    tanks: [],
    translate,
    ...partial,
  })
}

test.group('proposeInstrumentMapping', () => {
  test('inventaire vide : aucune proposition', ({ assert }) => {
    assert.deepEqual(run({}), [])
  })

  test('batterie inconnue : création nommée « rôle (modèle) »', ({ assert }) => {
    const proposals = run({
      devices: [
        device(['electrical.batteries.house.voltage'], {
          manufacturer: 'Victron',
          model: 'BMV-712',
        }),
      ],
    })
    assert.deepEqual(proposals, [
      {
        kind: 'battery',
        instrumentKey: 'house',
        deviceLabel: 'Victron BMV-712',
        suggestedName: 'battery.house (Victron BMV-712)',
        existingId: null,
        tankType: null,
      },
    ])
  })

  test('batterie existante du même nom (casse et accents ignorés) : rattachement', ({ assert }) => {
    // Le traducteur de test rend « battery.start » pour la clé `start`.
    const [matched] = run({
      devices: [device(['electrical.batteries.start.voltage'])],
      batteries: [{ id: 7, name: '  BATTERY.start ', instrumentKey: null }],
    })
    assert.equal(matched.existingId, 7)
    assert.equal(matched.suggestedName, '  BATTERY.start ')

    const [other] = run({
      devices: [device(['electrical.batteries.start.voltage'])],
      batteries: [{ id: 8, name: 'Propulseur', instrumentKey: null }],
    })
    assert.isNull(other.existingId)
  })

  test('batterie numérotée : « Batterie n+1 »', ({ assert }) => {
    const [proposal] = run({ devices: [device(['electrical.batteries.0.voltage'])] })
    assert.equal(proposal.suggestedName, 'battery.indexed:1 (Appareil)')
  })

  test('clé déjà prise par une batterie ou une cuve : non reproposée', ({ assert }) => {
    const proposals = run({
      devices: [device(['electrical.batteries.house.voltage', 'tanks.fuel.0.currentLevel'])],
      batteries: [{ id: 1, name: 'Servitude', instrumentKey: 'house' }],
      tanks: [{ id: 2, name: 'Gasoil', type: 'fuel', instrumentKey: 'fuel.0' }],
    })
    assert.deepEqual(proposals, [])
  })

  test('cuve : création « Gasoil (Maretron TLM100) » et type dans la proposition', ({ assert }) => {
    const [proposal] = run({
      devices: [
        device(['tanks.fuel.0.currentLevel'], { manufacturer: 'Maretron', model: 'TLM100' }),
      ],
    })
    assert.equal(proposal.kind, 'tank')
    assert.equal(proposal.instrumentKey, 'fuel.0')
    assert.equal(proposal.tankType, 'fuel')
    assert.equal(proposal.suggestedName, 'tank.fuel (Maretron TLM100)')
    assert.isNull(proposal.existingId)
  })

  test('cuve de type inconnu : ignorée', ({ assert }) => {
    assert.deepEqual(run({ devices: [device(['tanks.mystery.0.currentLevel'])] }), [])
  })

  test('deux cuves du même type : numérotées', ({ assert }) => {
    const proposals = run({
      devices: [device(['tanks.freshWater.0.currentLevel', 'tanks.freshWater.1.currentLevel'])],
    })
    assert.deepEqual(
      proposals.map((p) => p.suggestedName),
      ['tank.freshWater 1 (Appareil)', 'tank.freshWater 2 (Appareil)']
    )
  })

  test('cuve existante sans clé, même type et même nom : rattachement', ({ assert }) => {
    const [proposal] = run({
      devices: [device(['tanks.fuel.0.currentLevel'])],
      tanks: [
        { id: 3, name: 'tank.fuel', type: 'fuel', instrumentKey: null },
        { id: 4, name: 'tank.fuel', type: 'freshWater', instrumentKey: null },
      ],
    })
    assert.equal(proposal.existingId, 3)
  })

  test('moteur : rattaché seulement si un moteur sans clé ↔ une clé sans moteur', ({ assert }) => {
    const single = run({
      devices: [device(['propulsion.port.runTime'])],
      engines: [{ id: 10, instrumentKey: null }],
    })
    assert.equal(single[0].kind, 'engine')
    assert.equal(single[0].existingId, 10)
    assert.equal(single[0].suggestedName, 'engine.port')

    const ambiguous = run({
      devices: [device(['propulsion.port.runTime', 'propulsion.starboard.runTime'])],
      engines: [
        { id: 10, instrumentKey: null },
        { id: 11, instrumentKey: null },
      ],
    })
    assert.deepEqual(
      ambiguous.map((p) => p.existingId),
      [null, null]
    )
  })

  test('moteur déjà relié : non reproposé', ({ assert }) => {
    const proposals = run({
      devices: [device(['propulsion.port.runTime', 'propulsion.starboard.runTime'])],
      engines: [{ id: 10, instrumentKey: 'port' }],
    })
    assert.deepEqual(
      proposals.map((p) => p.instrumentKey),
      ['starboard']
    )
  })

  test('appareil disparu : ses chemins ne sont pas proposés', ({ assert }) => {
    const proposals = run({
      devices: [device(['electrical.batteries.house.voltage'], { goneAt: new Date() })],
    })
    assert.deepEqual(proposals, [])
  })

  test('chemin fourni par deux appareils : une seule proposition', ({ assert }) => {
    const proposals = run({
      devices: [
        device(['electrical.batteries.house.voltage'], { model: 'A' }),
        device(['electrical.batteries.house.current'], { model: 'B' }),
      ],
    })
    assert.lengthOf(proposals, 1)
  })
})
