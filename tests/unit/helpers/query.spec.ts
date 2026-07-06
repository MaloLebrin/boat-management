import { test } from '@japa/runner'
import {
  clampInt,
  escapeLike,
  normalizeEnum,
  toIntegerOrUndefined,
  toTrimmedStringOrUndefined,
} from '#shared/helpers/query'

test.group('query.escapeLike (issue #278)', () => {
  test('escapes LIKE wildcard %', ({ assert }) => {
    assert.equal(escapeLike('100%'), '100\\%')
    assert.equal(escapeLike('%'), '\\%')
  })

  test('escapes LIKE wildcard _', ({ assert }) => {
    assert.equal(escapeLike('a_b'), 'a\\_b')
    assert.equal(escapeLike('_'), '\\_')
  })

  test('escapes the escape character \\ itself, before adding new ones', ({ assert }) => {
    assert.equal(escapeLike('\\'), '\\\\')
    // `\%` doit devenir `\\` (backslash littéral) + `\%` (wildcard échappé)
    assert.equal(escapeLike('\\%'), '\\\\\\%')
  })

  test('leaves ordinary characters untouched', ({ assert }) => {
    assert.equal(escapeLike('Dupont'), 'Dupont')
    assert.equal(escapeLike('jean@example.com'), 'jean@example.com')
    assert.equal(escapeLike(''), '')
  })

  test('escapes every metacharacter in a mixed string', ({ assert }) => {
    assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\')
  })
})

test.group('query.toTrimmedStringOrUndefined (issue #281)', () => {
  test('trims and returns the string', ({ assert }) => {
    assert.equal(toTrimmedStringOrUndefined('  hello  '), 'hello')
    assert.equal(toTrimmedStringOrUndefined('x'), 'x')
  })

  test('returns undefined for empty / whitespace-only / non-string', ({ assert }) => {
    assert.isUndefined(toTrimmedStringOrUndefined(''))
    assert.isUndefined(toTrimmedStringOrUndefined('   '))
    assert.isUndefined(toTrimmedStringOrUndefined(undefined))
    assert.isUndefined(toTrimmedStringOrUndefined(null))
    assert.isUndefined(toTrimmedStringOrUndefined(42))
    assert.isUndefined(toTrimmedStringOrUndefined(['a']))
  })
})

test.group('query.toIntegerOrUndefined (issue #281)', () => {
  test('parses integer strings', ({ assert }) => {
    assert.equal(toIntegerOrUndefined('10'), 10)
    assert.equal(toIntegerOrUndefined('0'), 0)
    assert.equal(toIntegerOrUndefined('-3'), -3)
    assert.equal(toIntegerOrUndefined('20abc'), 20)
  })

  test('accepts an already-integer number', ({ assert }) => {
    assert.equal(toIntegerOrUndefined(7), 7)
  })

  test('returns undefined for NaN / non-integer / non-numeric', ({ assert }) => {
    assert.isUndefined(toIntegerOrUndefined('not-a-number'))
    assert.isUndefined(toIntegerOrUndefined(''))
    assert.isUndefined(toIntegerOrUndefined(3.5))
    assert.isUndefined(toIntegerOrUndefined(Number.NaN))
    assert.isUndefined(toIntegerOrUndefined(undefined))
    assert.isUndefined(toIntegerOrUndefined(null))
  })
})

test.group('query.clampInt (issue #281)', () => {
  test('bounds the value within [min, max]', ({ assert }) => {
    assert.equal(clampInt(5, 1, 10), 5)
    assert.equal(clampInt(0, 1, 10), 1)
    assert.equal(clampInt(999, 1, 10), 10)
    assert.equal(clampInt(1, 1, 1), 1)
  })
})

test.group('query.normalizeEnum (issue #281)', () => {
  const SORTS = ['name', 'recent'] as const

  test('returns the value when it is allowed', ({ assert }) => {
    assert.equal(normalizeEnum('name', SORTS, 'recent'), 'name')
    assert.equal(normalizeEnum('recent', SORTS, 'recent'), 'recent')
  })

  test('returns the fallback when value is not allowed or not a string', ({ assert }) => {
    assert.equal(normalizeEnum('bogus', SORTS, 'recent'), 'recent')
    assert.equal(normalizeEnum(undefined, SORTS, 'recent'), 'recent')
    assert.equal(normalizeEnum(42, SORTS, 'recent'), 'recent')
  })

  test('supports an out-of-list fallback (e.g. "" for "all")', ({ assert }) => {
    const STATUSES = ['active', 'inactive'] as const
    assert.equal(normalizeEnum('active', STATUSES, ''), 'active')
    assert.equal(normalizeEnum('bogus', STATUSES, ''), '')
  })
})
