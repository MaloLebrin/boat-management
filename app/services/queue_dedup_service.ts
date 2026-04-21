import QueueDedupKey, { QUEUE_DEDUP_KEY_STATUSES } from '#models/queue_dedup_key'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'

export type EnqueueUniqueResult = { enqueued: true; key: string } | { enqueued: false; key: string }

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    // Postgres unique violation
    (error as any).code === '23505'
  )
}

export default class QueueDedupService {
  async enqueueUnique<TPayload>(options: {
    key: string
    jobName: string
    queue: string
    payload: TPayload
    dispatch: (payload: TPayload) => Promise<unknown>
  }): Promise<EnqueueUniqueResult> {
    const payloadHash = createHash('sha256').update(JSON.stringify(options.payload)).digest('hex')

    try {
      await db.transaction(async (trx) => {
        await QueueDedupKey.create(
          {
            key: options.key,
            jobName: options.jobName,
            queue: options.queue,
            status: QUEUE_DEDUP_KEY_STATUSES.PENDING,
            queueJobId: null,
            payloadHash,
            completedAt: null,
            lastError: null,
          },
          { client: trx }
        )

        // Dispatch outside of this model create but still within the same
        // transaction boundary for the dedup lock.
        await options.dispatch(options.payload)
      })
    } catch (error) {
      if (isUniqueViolation(error)) return { enqueued: false, key: options.key }
      throw error
    }

    return { enqueued: true, key: options.key }
  }

  async markRunning(key: string) {
    await QueueDedupKey.query()
      .where('key', key)
      .update({ status: QUEUE_DEDUP_KEY_STATUSES.RUNNING, lastError: null })
  }

  async markCompleted(key: string) {
    await QueueDedupKey.query().where('key', key).update({
      status: QUEUE_DEDUP_KEY_STATUSES.COMPLETED,
      completedAt: DateTime.now(),
      lastError: null,
    })
  }

  async markFailed(key: string, error: Error) {
    await QueueDedupKey.query().where('key', key).update({
      status: QUEUE_DEDUP_KEY_STATUSES.FAILED,
      lastError: error.message,
    })
  }
}
