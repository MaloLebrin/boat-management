import { test } from '@japa/runner'
import RunAiChat from '#jobs/run_ai_chat'
import QueueDedupKey from '#models/queue_dedup_key'
import AiQueueService from '#services/ai_queue_service'
import QueueDedupService from '#services/queue_dedup_service'

test.group('RunAiChat (unit)', () => {
  test('enqueueChat is deduplicated by key (drop strategy)', async ({ assert }) => {
    const dispatched: any[] = []
    const original = RunAiChat.dispatch
    RunAiChat.dispatch = (async (payload: any) => {
      dispatched.push(payload)
    }) as any

    const svc = new AiQueueService(new QueueDedupService())
    await svc.enqueueChat({
      userId: 1,
      organizationId: 1,
      messages: [{ role: 'user', content: 'Hello' }],
      correlationId: 'test-corr',
    })
    await svc.enqueueChat({
      userId: 1,
      organizationId: 1,
      messages: [{ role: 'user', content: 'Hello' }],
      correlationId: 'test-corr',
    })

    RunAiChat.dispatch = original

    assert.equal(dispatched.length, 1)

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
    const dispatched: any[] = []
    const original = RunAiChat.dispatch
    RunAiChat.dispatch = (async (payload: any) => {
      dispatched.push(payload)
    }) as any

    const svc = new AiQueueService(new QueueDedupService())
    await svc.enqueueChat({
      userId: 1,
      organizationId: 1,
      messages: [{ role: 'user', content: 'Hello' }],
      correlationId: 'payload-check',
    })

    RunAiChat.dispatch = original

    assert.equal(dispatched.length, 1)
    assert.equal(dispatched[0]!.correlationId, 'payload-check')
    assert.isString(dispatched[0]!.dedupKey)
  })
})
