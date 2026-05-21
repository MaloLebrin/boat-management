import { defineConfig, stores } from '@adonisjs/limiter'

const limiterConfig = defineConfig({
  default: 'database',
  stores: {
    database: stores.database({
      tableName: 'rate_limits',
    }),
    memory: stores.memory({}),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
