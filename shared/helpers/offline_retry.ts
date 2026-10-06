/**
 * Délai de relance de la file hors-ligne après une erreur transitoire (#950).
 *
 * Sur 5xx ou coupure réseau, rejouer immédiatement au prochain événement
 * `online` martèle un lien satellite dégradé (Starlink en obstruction : Wi-Fi
 * de bord associé, WAN mort). Le délai double à chaque tentative et plafonne,
 * un succès ou un refus 4xx remet le compteur à zéro.
 */

export const OFFLINE_RETRY_BASE_MS = 1_000
export const OFFLINE_RETRY_MAX_MS = 5 * 60_000

/**
 * `attempt` est le nombre d'échecs transitoires consécutifs déjà subis
 * (1 après le premier). Toute valeur < 1 est traitée comme 1.
 */
export function retryDelayMs(attempt: number): number {
  const exponent = Math.max(1, Math.floor(attempt)) - 1
  return Math.min(OFFLINE_RETRY_MAX_MS, OFFLINE_RETRY_BASE_MS * 2 ** exponent)
}
