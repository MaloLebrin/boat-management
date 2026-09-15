import { test } from '@japa/runner'
import {
  ENGINE_STROKE_SHORT_LABELS,
  engineLabelWithStroke,
  resolveEngineStrokeType,
} from '#shared/helpers/engine_stroke'

test.group('Cycle moteur affiché (2T / 4T)', () => {
  test('le cycle saisi l’emporte sur toute déduction', ({ assert }) => {
    assert.equal(
      resolveEngineStrokeType({ strokeType: '2_stroke', family: 'outboard_4t', fuel: 'diesel' }),
      '2_stroke'
    )
    assert.equal(resolveEngineStrokeType({ strokeType: '4_stroke', kind: 'outboard' }), '4_stroke')
  })

  test('ignore une valeur de cycle inconnue', ({ assert }) => {
    assert.isNull(resolveEngineStrokeType({ strokeType: 'rotary', kind: 'outboard' }))
  })

  test('déduit le cycle de la famille hors-bord', ({ assert }) => {
    assert.equal(resolveEngineStrokeType({ family: 'outboard_2t' }), '2_stroke')
    assert.equal(resolveEngineStrokeType({ family: 'outboard_4t' }), '4_stroke')
  })

  test('classe en 4T les installations in-bord, embase Z et pod', ({ assert }) => {
    for (const family of [
      'inboard_diesel_shaft',
      'inboard_diesel_saildrive',
      'inboard_petrol',
      'sterndrive',
      'pod_drive',
    ]) {
      assert.equal(resolveEngineStrokeType({ family }), '4_stroke', family)
    }
  })

  test('classe en 4T un diesel ou un in-bord essence sans famille', ({ assert }) => {
    assert.equal(resolveEngineStrokeType({ kind: 'outboard', fuel: 'diesel' }), '4_stroke')
    assert.equal(resolveEngineStrokeType({ kind: 'inboard', fuel: 'essence' }), '4_stroke')
  })

  test('n’invente rien quand le cycle est indécidable', ({ assert }) => {
    assert.isNull(resolveEngineStrokeType({ kind: 'outboard', fuel: 'essence' }))
    assert.isNull(resolveEngineStrokeType({ kind: 'outboard' }))
    assert.isNull(resolveEngineStrokeType({ family: 'jet', fuel: 'essence' }))
    assert.isNull(resolveEngineStrokeType({ family: 'generator', fuel: 'essence' }))
    assert.isNull(resolveEngineStrokeType({}))
  })

  test('n’affiche aucun cycle pour un moteur électrique ou hybride', ({ assert }) => {
    assert.isNull(resolveEngineStrokeType({ kind: 'electric' }))
    assert.isNull(resolveEngineStrokeType({ kind: 'hybrid', fuel: 'diesel' }))
    assert.isNull(resolveEngineStrokeType({ kind: 'inboard', fuel: 'electric' }))
    assert.isNull(resolveEngineStrokeType({ family: 'electric_outboard', fuel: 'diesel' }))
  })

  test('expose la notation courte 2T / 4T', ({ assert }) => {
    assert.deepEqual(ENGINE_STROKE_SHORT_LABELS, { '2_stroke': '2T', '4_stroke': '4T' })
  })
})

test.group('engineLabelWithStroke — suffixe cycle sur libellé moteur', () => {
  test('ajoute le cycle déduit au libellé', ({ assert }) => {
    assert.equal(engineLabelWithStroke('Yamaha 40', { family: 'outboard_2t' }), 'Yamaha 40 · 2T')
    assert.equal(engineLabelWithStroke('Mercury 60', { family: 'outboard_4t' }), 'Mercury 60 · 4T')
  })

  test('utilise le cycle saisi en priorité', ({ assert }) => {
    assert.equal(
      engineLabelWithStroke('Yamaha 40', { strokeType: '4_stroke', family: 'outboard_2t' }),
      'Yamaha 40 · 4T'
    )
  })

  test('retourne le libellé inchangé si le cycle est indécidable', ({ assert }) => {
    assert.equal(engineLabelWithStroke('Moteur inconnu', {}), 'Moteur inconnu')
    assert.equal(engineLabelWithStroke('Jet', { family: 'jet', fuel: 'essence' }), 'Jet')
  })

  test('retourne le libellé inchangé pour un moteur électrique', ({ assert }) => {
    assert.equal(engineLabelWithStroke('Torqeedo', { kind: 'electric' }), 'Torqeedo')
  })
})
