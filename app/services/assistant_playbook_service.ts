import {
  ASSISTANT_MAX_PLAYBOOKS,
  ASSISTANT_PLAYBOOK_PAGE_BONUS,
  ASSISTANT_PLAYBOOKS,
  type AssistantPlaybook,
} from '#shared/constants/assistant/playbooks'
import { normalizeHelpText, tokenizeHelpQuery } from '#services/assistant_product_help_service'
import type { AiSuggestionLocale } from '#shared/types/ai'
import type { PlanQuotas } from '#shared/types/plan'

/**
 * Sélection des playbooks du copilote — déterministe, donc testable : même
 * barème que la base produit (mots-clés ×5, titre ×3, corps ×1) sur le message
 * de l'utilisateur, plus un bonus fixe quand la page courante appartient au
 * domaine. Filtrés par flag de plan EFFECTIF, 2 max, score nul exclu.
 */
export default class AssistantPlaybookService {
  select(
    message: string,
    pagePath: string | null,
    quotas: PlanQuotas,
    locale: AiSuggestionLocale
  ): AssistantPlaybook[] {
    const tokens = tokenizeHelpQuery(message)

    return (
      ASSISTANT_PLAYBOOKS.map((playbook, index) => ({
        playbook,
        index,
        score: this.#score(playbook, tokens, pagePath, locale),
      }))
        .filter(
          (scored) =>
            scored.score > 0 &&
            (scored.playbook.planFlag === undefined || quotas[scored.playbook.planFlag])
        )
        // Tri stable et déterministe : score décroissant puis ordre du fichier.
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, ASSISTANT_MAX_PLAYBOOKS)
        .map(({ playbook }) => playbook)
    )
  }

  /** Section de prompt « Repères d'expert » — `null` quand rien n'est retenu. */
  buildPromptSection(playbooks: AssistantPlaybook[], locale: AiSuggestionLocale): string | null {
    if (playbooks.length === 0) return null
    const header =
      locale === 'fr' ? "Repères d'expert pour cette demande :" : 'Expert notes for this request:'
    const blocks = playbooks.map((p) => `[${p.title[locale]}] ${p.body[locale]}`)
    return `${header}\n${blocks.join('\n')}`
  }

  #score(
    playbook: AssistantPlaybook,
    tokens: string[],
    pagePath: string | null,
    locale: AiSuggestionLocale
  ): number {
    const keywords = playbook.keywords.join(' ')
    const title = normalizeHelpText(playbook.title[locale])
    const body = normalizeHelpText(playbook.body[locale])

    let score = 0
    for (const token of tokens) {
      if (keywords.includes(token)) score += 5
      if (title.includes(token)) score += 3
      if (body.includes(token)) score += 1
    }
    if (pagePath !== null && playbook.pagePrefixes.some((prefix) => pagePath.startsWith(prefix))) {
      score += ASSISTANT_PLAYBOOK_PAGE_BONUS
    }
    return score
  }
}
