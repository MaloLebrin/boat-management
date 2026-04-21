import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export const QUEUE_DEDUP_KEY_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export const queueDedupKeyStatusValues = Object.values(QUEUE_DEDUP_KEY_STATUSES)

export type QueueDedupKeyStatus =
  (typeof QUEUE_DEDUP_KEY_STATUSES)[keyof typeof QUEUE_DEDUP_KEY_STATUSES]

export default class QueueDedupKey extends BaseModel {
  static table = 'queue_dedup_keys'

  @column({ isPrimary: true })
  declare key: string

  @column()
  declare jobName: string

  @column()
  declare queue: string

  @column()
  declare status: QueueDedupKeyStatus

  @column()
  declare queueJobId: string | null

  @column()
  declare payloadHash: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  @column()
  declare lastError: string | null
}
