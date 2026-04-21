import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import RunAiChat from '#jobs/run_ai_chat'
import QueueDedupKey from '#models/queue_dedup_key'
import AiQueueService from '#services/ai_queue_service'

test.group('RunAiChat (unit)', (group) => {
  group.each.teardown(async () => {
    await db.from('queue_jobs').where('queue', 'ai').delete()
    await QueueDedupKey.query().delete()
  })

  test('enqueueChat is deduplicated by key (drop strategy)', async ({ assert }) => {
    const svc = new AiQueueService()
    await svc.enqueueChat({
      userId: 1,
      messages: [{ role: 'user', content: 'Hello' }],
      correlationId: 'test-corr',
    })
    await svc.enqueueChat({
      userId: 1,
      messages: [{ role: 'user', content: 'Hello' }],
      correlationId: 'test-corr',
    })

    const jobs = await db.from('queue_jobs').where('queue', 'ai')
    assert.equal(jobs.length, 1)

    const keys = await QueueDedupKey.all()
    assert.equal(keys.length, 1)
    assert.equal(
      keys[0]!.key,
      RunAiChat.dedupKey({
        userId: 1,
        correlationId: 'test-corr',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    )
  })

  test('enqueueChat persists the job data payload', async ({ assert }) => {
    const svc = new AiQueueService()
    await svc.enqueueChat({
      userId: 1,
      messages: [{ role: 'user', content: 'Hello' }],
      correlationId: 'payload-check',
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
      correlationId: 'payload-check',
    })
  })
})
