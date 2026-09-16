import db from '@adonisjs/lucid/services/db'

interface KnexQueryEvent {
  sql: string
}

/**
 * Compte les requêtes SQL émises pendant `run`, en écoutant l'événement
 * `query` de knex (émis même quand `debug` est désactivé, et relayé par les
 * transactions vers leur client parent — la transaction globale de la suite
 * integration n'y échappe donc pas).
 *
 * `table` restreint le compte aux requêtes qui mentionnent cette table, ce qui
 * rend l'assertion insensible aux requêtes annexes (session, utilisateur…).
 */
export async function countQueries(
  run: () => Promise<unknown>,
  options: { table?: string } = {}
): Promise<number> {
  const knex = db.connection().getWriteClient()
  let count = 0
  const listener = (event: KnexQueryEvent) => {
    if (options.table === undefined || event.sql.includes(`"${options.table}"`)) count++
  }
  knex.on('query', listener)
  try {
    await run()
  } finally {
    knex.removeListener('query', listener)
  }
  return count
}
