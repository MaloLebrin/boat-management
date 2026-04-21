import { BaseSchema } from '@adonisjs/lucid/schema'
import { queueDedupKeyStatusValues } from '#models/queue_dedup_key'

export default class extends BaseSchema {
  protected tableName = 'queue_dedup_keys'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('key', 255).notNullable().primary()
      table.string('job_name', 128).notNullable()
      table.string('queue', 64).notNullable()
      table.string('status', 16).notNullable()

      table.string('queue_job_id', 255).nullable()
      table.string('payload_hash', 64).nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.timestamp('completed_at').nullable()
      table.text('last_error').nullable()

      table.index(['job_name', 'status'], `${this.tableName}_job_status_idx`)
    })

    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_status_check"
      CHECK (status IN (${queueDedupKeyStatusValues.map((s) => `'${s}'`).join(',')}))
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
