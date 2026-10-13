import {
  PRODUCT_KNOWLEDGE,
  type ProductHelpEntry,
} from '#shared/constants/assistant/product_knowledge'
import type { AiSuggestionLocale } from '#shared/types/ai'
import type { ProductHelpHit } from '#shared/types/assistant'

/**
 * Recherche dans la base de connaissance produit (#642), partagée depuis #971.
 *
 * Le serveur l'enveloppe dans l'outil `search_product_help` du copilote ; le
 * panneau l'appelle tel quel hors-ligne, la base étant déjà dans le bundle
 * client. Une seule implémentation : en mer, l'aide locale répond exactement
 * ce que le copilote aurait trouvé.
 */

/** Nombre d'entrées renvoyées par recherche. */
export const PRODUCT_HELP_MAX_RESULTS = 3

/**
 * Normalisation d'un texte pour le scoring : minuscules, accents retirés —
 * le vocabulaire de `keywords` suit la même convention.
 */
export function normalizeHelpText(raw: string): string {
  return raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Tokens de recherche : mots normalisés de 3 caractères et plus. */
export function tokenizeHelpQuery(raw: string): string[] {
  return normalizeHelpText(raw)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
}

/**
 * Score déterministe d'une entrée : mots-clés (x5), puis titre (x3), puis
 * corps (x1) — pas d'embeddings, pas de service externe, donc testable.
 */
export function scoreHelpEntry(
  entry: ProductHelpEntry,
  tokens: string[],
  locale: AiSuggestionLocale
): number {
  if (tokens.length === 0) return 0
  const keywords = entry.keywords.join(' ')
  const title = normalizeHelpText(entry.title[locale])
  const body = normalizeHelpText(entry.body[locale])

  let score = 0
  for (const token of tokens) {
    if (keywords.includes(token)) score += 5
    if (title.includes(token)) score += 3
    if (body.includes(token)) score += 1
  }
  return score
}

/** Les meilleures entrées pour une question, dans la locale demandée. */
export function searchProductHelp(
  query: string,
  locale: AiSuggestionLocale,
  knowledge: readonly ProductHelpEntry[] = PRODUCT_KNOWLEDGE
): ProductHelpHit[] {
  const tokens = tokenizeHelpQuery(query)

  return (
    knowledge
      .map((entry, index) => ({ entry, index, score: scoreHelpEntry(entry, tokens, locale) }))
      .filter((scored) => scored.score > 0)
      // Tri stable et déterministe : score décroissant puis ordre du fichier.
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, PRODUCT_HELP_MAX_RESULTS)
      .map(({ entry }) => ({
        id: entry.id,
        title: entry.title[locale],
        body: entry.body[locale],
        navTarget: entry.navTarget,
      }))
  )
}
