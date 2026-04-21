import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import RunAiChat from '#jobs/run_ai_chat'

test.group('RunAiChat (unit)', (group) => {
  group.each.teardown(async () => {
    await db.from('queue_jobs').where('queue', 'ai').delete()
  })

  test('dispatch persists a job in Postgres queue_jobs', async ({ assert }) => {
    await RunAiChat.dispatch({
      messages: [{ role: 'user', content: 'Hello' }],
      correlationId: 'test-corr',
    })

    const row = await db
      .from('queue_jobs')
      .select(['queue', 'status', 'data'])
      .where('queue', 'ai')
      .orderBy('execute_at', 'desc')
      .first()

    assert.isDefined(row)
    assert.equal(row.queue, 'ai')
    assert.isString(row.data)

    const data = JSON.parse(row.data)
    assert.equal(data.name, 'RunAiChat')
    assert.deepInclude(data.payload, {
      correlationId: 'test-corr',
    })
  })
})
