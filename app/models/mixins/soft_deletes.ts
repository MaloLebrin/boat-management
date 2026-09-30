/**
 * Marqueur posé sur le nœud Lucid `whereNull('deletedAt')`.
 * Lucid n'écrit le SQL Knex qu'au moment de `applyWhere` : le marqueur doit
 * vivre dans `whereStack`, dont le clone de `paginate` partage les nœuds.
 */
const SOFT_DELETE_MARK = 'softDeleteScope'

type ScopeMode = 'with' | 'only' | 'default'

interface WhereNode {
  method: string
  args: unknown[]
  [SOFT_DELETE_MARK]?: 'exclude'
}

interface SoftQuery {
  whereStack: WhereNode[][]
  sideloaded: Record<string, unknown>
  sideload(values: Record<string, unknown>, merge?: boolean): SoftQuery
  whereNull(column: string): SoftQuery
  whereNotNull(column: string): SoftQuery
}

function asSoft(query: object): SoftQuery {
  return query as SoftQuery
}

function scopeMode(query: SoftQuery): ScopeMode {
  const mode = query.sideloaded.softDelete
  if (mode === 'with' || mode === 'only') return mode
  return 'default'
}

function hasExcludeClause(query: SoftQuery): boolean {
  return query.whereStack.some((collection) =>
    collection.some((node) => node[SOFT_DELETE_MARK] === 'exclude')
  )
}

/**
 * Scope par défaut : exclure les lignes en corbeille. Idempotent, pour que
 * `query()`, `first()` et `paginate` ne l'empilent pas.
 */
export function applyDefaultScope(query: object) {
  const soft = asSoft(query)
  if (scopeMode(soft) !== 'default') return
  if (hasExcludeClause(soft)) return
  soft.whereNull('deletedAt')
  const clauses = soft.whereStack[soft.whereStack.length - 1]
  const clause = clauses?.[clauses.length - 1]
  if (clause) clause[SOFT_DELETE_MARK] = 'exclude'
}

/** Inclut les lignes en corbeille (purge, restauration, identité réservée). */
export function withTrashed<T extends object>(query: T): T {
  const soft = asSoft(query)
  for (const collection of soft.whereStack) {
    const index = collection.findIndex((node) => node[SOFT_DELETE_MARK] === 'exclude')
    if (index >= 0) collection.splice(index, 1)
  }
  soft.sideload({ softDelete: 'with' }, true)
  return query
}

/** Uniquement les lignes en corbeille. */
export function onlyTrashed<T extends object>(query: T): T {
  withTrashed(query)
  const soft = asSoft(query)
  soft.whereNotNull('deletedAt')
  soft.sideload({ softDelete: 'only' }, true)
  return query
}
