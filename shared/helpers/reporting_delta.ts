/**
 * Variation en % d'un indicateur du reporting (#887) par rapport à la période
 * précédente ; `null` sans base de comparaison. Sans dépendance à luxon : ce
 * helper est aussi chargé côté navigateur.
 */
export function reportDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}
