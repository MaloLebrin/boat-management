import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Couleurs de graphique lues dans les design tokens (#887).
 *
 * chart.js dessine sur un `<canvas>` : il ne connaît ni les classes Tailwind
 * ni `var(--…)`. On résout donc les variables CSS au montage, puis à chaque
 * bascule de `data-theme` sur `<html>` — le graphique suit le thème sombre
 * sans une seule couleur écrite en dur dans le composant.
 */
export function useChartPalette<K extends string>(tokens: Record<K, string>) {
  const resolve = (): Record<K, string> => {
    const out = {} as Record<K, string>
    const style =
      typeof window === 'undefined' ? null : window.getComputedStyle(document.documentElement)
    for (const key of Object.keys(tokens) as K[]) {
      out[key] = style?.getPropertyValue(tokens[key]).trim() ?? ''
    }
    return out
  }

  const colors = ref(resolve()) as { value: Record<K, string> }
  let observer: MutationObserver | null = null

  onMounted(() => {
    colors.value = resolve()
    observer = new MutationObserver(() => {
      colors.value = resolve()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })
  })

  onUnmounted(() => observer?.disconnect())

  return colors
}

/** Une couleur par poste de coût, dans l'ordre de `REPORT_COST_CATEGORIES`. */
export const COST_CATEGORY_TOKENS = {
  maintenance: '--color-amber-600',
  fuel: '--color-sky-700',
  documents: '--color-violet-600',
  port: '--color-mint-600',
  equipment: '--color-coral-500',
  entries: '--color-fg-subtle',
} as const
