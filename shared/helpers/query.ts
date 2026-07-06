/**
 * Échappe les métacaractères d'un motif `LIKE` / `ILIKE` (`%`, `_`) ainsi que
 * le caractère d'échappement lui-même (`\`), afin qu'une saisie utilisateur
 * soit traitée littéralement plutôt qu'interprétée comme des jokers SQL.
 *
 * Sans cet échappement, `q = '%'` produit le motif `%%%` qui matche **toutes**
 * les lignes, et `q = '_'` matche tout enregistrement d'au moins un caractère
 * (contrat de recherche cassé — voir issue #278).
 *
 * PostgreSQL utilise `\` comme caractère d'échappement par défaut pour `LIKE`
 * (pas de clause `ESCAPE` explicite nécessaire). L'ordre remplace `\` en
 * premier pour ne pas ré-échapper les backslashes ajoutés ensuite.
 *
 * @example
 * escapeLike('100%')      // → '100\\%'
 * `%${escapeLike(q)}%`    // motif « contient q » sûr
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/**
 * Helpers génériques de normalisation des paramètres de liste (recherche / tri
 * / pagination) partagés par les services org-scopés (`client_service`,
 * `boat_list_service`, …). Mutualisés ici pour éviter la divergence silencieuse
 * entre copies verbatim — voir issue #281.
 */

/**
 * Trim une valeur de query string et renvoie `undefined` si elle n'est pas une
 * chaîne ou est vide après trim (utile pour appliquer un défaut avec `??`).
 */
export function toTrimmedStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Parse un entier depuis une query string (ou accepte un nombre entier tel
 * quel). Renvoie `undefined` si la valeur n'est pas un entier fini — jamais
 * `NaN`, qui casserait un `clampInt` ou une requête SQL en aval.
 */
export function toIntegerOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Borne un entier dans `[min, max]`. */
export function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Valide une valeur contre une liste d'options autorisées et renvoie le
 * `fallback` sinon. Généralise la validation d'énumération de tri / direction /
 * statut. Le type de retour `T | F` préserve les fallbacks hors-liste (ex. `''`
 * pour un statut « tous »).
 */
export function normalizeEnum<T extends string, F>(
  value: unknown,
  allowed: readonly T[],
  fallback: F
): T | F {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}
