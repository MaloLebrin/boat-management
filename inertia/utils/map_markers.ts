/**
 * Marqueurs HTML des cartes Leaflet (`L.divIcon`).
 *
 * Les deux cartes (position du bateau, tracé d'une sortie) dessinaient chacune
 * leur point GPS avec un hex de secours (`var(--color-brand,#2563eb)`) et un
 * blanc figé (`#fff`) : le premier ne sert à rien — `--color-brand` est défini
 * dans les deux thèmes — et le second restait blanc sur une carte sombre.
 */

export interface TrackDotOptions {
  /** Diamètre en pixels. */
  size: number
  /** Anneau clair autour du point (dernier point, point courant). */
  ring?: boolean
  /** Opacité du point (les points intermédiaires sont atténués). */
  opacity?: number
}

/** Point GPS d'un tracé — suit `--color-brand` dans les deux thèmes. */
export function trackDotHtml({ size, ring = false, opacity }: TrackDotOptions): string {
  const styles = [
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:50%',
    'background:var(--color-brand)',
  ]
  if (ring) {
    styles.push(
      'border:2px solid var(--color-surface-elevated)',
      'box-shadow:0 0 2px rgba(0,0,0,0.4)'
    )
  }
  if (opacity !== undefined) {
    styles.push(`opacity:${opacity}`)
  }
  return `<div style="${styles.join(';')};"></div>`
}

/** Marqueur du bateau (ancre), stylé par la classe `.boat-marker` de la carte. */
export const BOAT_MARKER_HTML = '<div class="boat-marker">⚓</div>'
