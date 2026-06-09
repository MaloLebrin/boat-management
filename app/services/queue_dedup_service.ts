import QueueDedupKey, { QUEUE_DEDUP_KEY_STATUSES } from '#models/queue_dedup_key'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'

export type EnqueueUniqueResult = { enqueued: true; key: string } | { enqueued: false; key: string }

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false

  const code = 'code' in error ? String((error as any).code) : null

  return code === '23505'
}

@inject()
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
