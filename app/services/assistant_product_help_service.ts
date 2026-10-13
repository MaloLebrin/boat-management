import { searchProductHelp } from '#shared/helpers/product_help_search'
import type { AiSuggestionLocale } from '#shared/types/ai'
import type { ProductHelpHit } from '#shared/types/assistant'
import { inject } from '@adonisjs/core'

// L'algorithme vit dans `shared/` depuis #971 : le panneau hors-ligne l'appelle
// sans serveur. Réexporté pour les appelants existants (playbooks, tests).
export {
  normalizeHelpText,
  PRODUCT_HELP_MAX_RESULTS,
  scoreHelpEntry,
  tokenizeHelpQuery,
} from '#shared/helpers/product_help_search'
export type { ProductHelpHit } from '#shared/types/assistant'

/**
 * Recherche dans la base de connaissance produit (#642) — enveloppée par
 * l'outil `search_product_help` du copilote.
 */
@inject()
export default class AssistantProductHelpService {
  search(query: string, locale: AiSuggestionLocale): ProductHelpHit[] {
    return searchProductHelp(query, locale)
  }
}
