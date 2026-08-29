import type { NavigationTitle } from '../types/navigation_title.js'

/**
 * Durée de validité par défaut, en années, des titres de navigation qui
 * expirent réellement (#585). Sert uniquement à **proposer** une date
 * d'expiration à la saisie : un titre absent de cette table (permis français,
 * CRR, PSC1…) est délivré à vie et ne pré-remplit rien.
 */
export const NAVIGATION_TITLE_VALIDITY_YEARS: Partial<Record<NavigationTitle, number>> = {
  medical_certificate: 2,
  stcw_basic: 5,
  stcw_proficiency: 5,
}

/**
 * Date d'expiration suggérée pour un titre, au format machine `YYYY-MM-DD`
 * (celui d'un `<input type="date">`), ou `null` si le titre ne se périme pas.
 *
 * Le pré-remplissage reste **non destructif** : l'appelant ne s'en sert que
 * lorsque le champ est vide ou porte encore une suggestion, jamais pour
 * écraser une date saisie.
 */
export function suggestedExpiryDate(
  type: NavigationTitle | '' | null | undefined,
  from: Date = new Date()
): string | null {
  if (!type) return null

  const years = NAVIGATION_TITLE_VALIDITY_YEARS[type]
  if (years === undefined) return null

  // On manipule un calendrier, pas un instant : les composantes locales sont
  // recomposées en UTC pour que `toISOString()` rende exactement la même date.
  const expiry = new Date(Date.UTC(from.getFullYear() + years, from.getMonth(), from.getDate()))
  return expiry.toISOString().slice(0, 10)
}
