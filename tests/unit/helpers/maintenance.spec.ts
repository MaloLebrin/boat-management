import { test } from '@japa/runner'
import {
  buildEngineCaption,
  isDueDateOverdue,
  isEngineKindCaption,
} from '#shared/helpers/maintenance'

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

test.group('isDueDateOverdue', () => {
  test('is overdue strictly before today', ({ assert }) => {
    assert.isTrue(isDueDateOverdue('2026-09-25', '2026-09-26'))
    assert.isTrue(isDueDateOverdue('2025-12-31', '2026-01-01'))
  })

  test('is not overdue today or later', ({ assert }) => {
    assert.isFalse(isDueDateOverdue('2026-09-26', '2026-09-26'))
    assert.isFalse(isDueDateOverdue('2026-10-06', '2026-09-26'))
  })
})
