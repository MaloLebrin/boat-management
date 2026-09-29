import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'
import env from '#start/env'

const poolMax = env.get('DB_POOL_MAX', 10)
const statementTimeoutMs = env.get('DB_STATEMENT_TIMEOUT_MS', 30_000)
const idleInTransactionTimeoutMs = env.get('DB_IDLE_IN_TRANSACTION_TIMEOUT_MS', 60_000)
const useSsl = env.get('DB_SSL', false)
const sslRejectUnauthorized = env.get('DB_SSL_REJECT_UNAUTHORIZED', true)

/**
 * Pose les timeouts de session sur chaque connexion du pool (#854).
 * Valeurs en millisecondes validées par Env — jamais de chaîne libre dans le SET.
 * `0` = illimité (comportement Postgres).
 */
function applySessionTimeouts(
  conn: { query: (sql: string, cb: (err: Error | null) => void) => void },
  done: (err: Error | null, conn: unknown) => void
) {
  conn.query(
    `SET statement_timeout = ${statementTimeoutMs}; SET idle_in_transaction_session_timeout = ${idleInTransactionTimeoutMs}`,
    (err) => done(err, conn)
  )
}

const dbConfig = defineConfig({
  connection: 'pg',

  connections: {
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD').release(),
        database: env.get('DB_DATABASE'),
        ssl: useSsl ? { rejectUnauthorized: sslRejectUnauthorized } : false,
      },
      pool: {
        min: 2,
        max: poolMax,
        acquireTimeoutMillis: 10_000,
        afterCreate: applySessionTimeouts,
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      debug: app.inDev,
    },

    /**
     * MySQL / MariaDB connection.
     * Install package to switch: npm install mysql2
     */
    // mysql: {
    //   client: 'mysql2',
    //   connection: {
    //     host: env.get('DB_HOST'),
    //     port: env.get('DB_PORT'),
    //     user: env.get('DB_USER'),
    //     password: env.get('DB_PASSWORD'),
    //     database: env.get('DB_DATABASE'),
    //   },
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   debug: app.inDev,
    // },

    /**
     * Microsoft SQL Server connection.
     * Install package to switch: npm install tedious
     */
    // mssql: {
    //   client: 'mssql',
    //   connection: {
    //     server: env.get('DB_HOST'),
    //     port: env.get('DB_PORT'),
    //     user: env.get('DB_USER'),
    //     password: env.get('DB_PASSWORD'),
    //     database: env.get('DB_DATABASE'),
    //   },
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   debug: app.inDev,
    // },

    /**
     * libSQL (Turso) connection.
     * Install package to switch: npm install @libsql/client
     */
    // libsql: {
    //   client: 'libsql',
    //   connection: {
    //     url: env.get('LIBSQL_URL'),
    //     authToken: env.get('LIBSQL_AUTH_TOKEN'),
    //   },
    //   useNullAsDefault: true,
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   debug: app.inDev,
    // },
  },
})

export default dbConfig
