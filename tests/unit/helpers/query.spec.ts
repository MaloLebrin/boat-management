import { test } from '@japa/runner'
import { escapeLike } from '#shared/helpers/query'

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
