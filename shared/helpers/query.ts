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
