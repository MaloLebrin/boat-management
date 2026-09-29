import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

test.group('Database session timeouts (#854)', () => {
  test('chaque connexion du pool a statement_timeout = 30s', async ({ assert }) => {
    const result = await db.rawQuery('SHOW statement_timeout')
    const value = result.rows[0].statement_timeout as string
    assert.equal(value, '30s')
  })

  test('chaque connexion du pool a idle_in_transaction_session_timeout = 1min', async ({
    assert,
  }) => {
    const result = await db.rawQuery('SHOW idle_in_transaction_session_timeout')
    const value = result.rows[0].idle_in_transaction_session_timeout as string
    assert.equal(value, '1min')
  })
})
