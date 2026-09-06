import { createHash } from 'node:crypto'

/**
 * Empreinte sha256 (hex) d'un contexte d'analyse IA.
 *
 * Le job planifié compare cette empreinte à celle de la dernière analyse pour
 * ne pas re-consommer de tokens quand rien n'a changé. La stabilité repose sur
 * l'ordre des clés produit par nos propres mappers (`AiSuggestionContextService`) :
 * réordonner un champ d'input invalide les empreintes une fois (une
 * régénération de plus, bornée par la cadence) — inoffensif.
 */
export function computeContextHash(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}
