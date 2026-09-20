/**
 * Budget journalier de la surface IA publique épuisé (#762).
 *
 * Distinct des plafonds par visiteur : ceux-là disent « vous avez utilisé vos
 * essais gratuits », celui-ci dit que la surface publique a consommé son
 * budget de tokens pour la journée, toutes IP confondues. Les deux chats se
 * dégradent alors proprement plutôt que de continuer à facturer.
 */
export class PublicAiDailyBudgetExhaustedError extends Error {
  constructor() {
    super('Public AI daily token budget exhausted')
    this.name = 'PublicAiDailyBudgetExhaustedError'
  }
}
