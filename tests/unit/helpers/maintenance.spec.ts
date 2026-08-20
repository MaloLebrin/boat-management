import { test } from '@japa/runner'
import { buildEngineCaption, isEngineKindCaption } from '#shared/helpers/maintenance'

test.group('buildEngineCaption', () => {
  test('joins brand, model and serial number when available', ({ assert }) => {
    const caption = buildEngineCaption({
      brand: 'Volvo Penta',
      model: 'D2-40',
      serialNumber: 'VP-1234',
      kind: 'inboard',
    })

    assert.equal(caption, 'Volvo Penta D2-40 VP-1234')
  })

  test('falls back to the raw kind token when the engine has no identity', ({ assert }) => {
    const caption = buildEngineCaption({
      brand: null,
      model: null,
      serialNumber: null,
      kind: 'inboard',
    })

    assert.equal(caption, 'inboard')
  })
})

test.group('isEngineKindCaption', () => {
  test('detects a caption that is exactly an engine kind token', ({ assert }) => {
    assert.isTrue(isEngineKindCaption('inboard'))
    assert.isTrue(isEngineKindCaption('outboard'))
    assert.isTrue(isEngineKindCaption('electric'))
  })

  test('leaves free text and empty captions alone', ({ assert }) => {
    assert.isFalse(isEngineKindCaption('Volvo Penta D2-40'))
    assert.isFalse(isEngineKindCaption('Inboard'))
    assert.isFalse(isEngineKindCaption(null))
    assert.isFalse(isEngineKindCaption(''))
  })
})
