import type { PlanTier } from '#shared/types/plan'

export type QuotaFeature =
  | 'boats'
  | 'members'
  | 'ai'
  | 'ai_tokens'
  | 'export'
  | 'storage'
  | 'clients'
  | 'pricing'
  | 'reservations'
  | 'invoices'
  | 'ports'

interface QuotaExceededOptions {
  limit: number | null
  current: number
  upgradeTo: PlanTier | null
  alreadyOverLimit?: boolean
}

export class QuotaExceededError extends Error {
  name = 'QuotaExceededError'

  readonly limit: number | null
  readonly current: number
  readonly upgradeTo: PlanTier | null
  readonly alreadyOverLimit: boolean

  constructor(
    public readonly feature: QuotaFeature,
    options: QuotaExceededOptions
  ) {
    super(`Quota exceeded: ${feature}`)
    this.limit = options.limit
    this.current = options.current
    this.upgradeTo = options.upgradeTo
    this.alreadyOverLimit = options.alreadyOverLimit ?? false
  }
}

/**
 * Clé de flash d'un refus de quota — **la seule** qui décide du message.
 *
 * `flash.quota.${feature}Exceeded` ne marche pas pour `ai_tokens` : la clé
 * traduite est `aiTokensExceeded`, pas `ai_tokensExceeded`, qui n'existe dans
 * aucune locale. C'est ce que les contrôleurs de l'IA contournaient en écrivant
 * la clé à la main, chacun de son côté ; le handler global, lui, aurait flashé
 * une clé brute.
 */
export function quotaFlashKey(error: QuotaExceededError): string {
  // Stockage déjà dépassé : le message parle de libérer de l'espace, pas de
  // passer à l'offre supérieure.
  if (error.feature === 'storage' && error.alreadyOverLimit) {
    return 'flash.quota.storageOverflow'
  }
  const feature = error.feature.replace(/_(\w)/g, (_, letter: string) => letter.toUpperCase())
  return `flash.quota.${feature}Exceeded`
}
