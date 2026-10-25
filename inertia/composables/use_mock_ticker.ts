import { onMounted, onUnmounted, ref } from 'vue'

export interface MockTickerOptions {
  /** Écart maximal d'un pas autour de la valeur courante. */
  amplitude: number
  intervalMs?: number
  min?: number
  max?: number
}

/**
 * Valeur **simulée** qui vit autour de `base` (maquettes marketing, #995) : un
 * pas aléatoire par tick, rappelé vers la base pour ne pas dériver. Rien côté
 * serveur (le SSR rend la base), et aucun minuteur sous `prefers-reduced-motion`.
 */
export function useMockTicker(base: number, options: MockTickerOptions) {
  const { amplitude, intervalMs = 1400, min = -Infinity, max = Infinity } = options
  const value = ref(base)
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    timer = setInterval(() => {
      const next = value.value + (Math.random() - 0.5) * 2 * amplitude
      const pulled = next + (base - next) * 0.25
      value.value = Math.min(max, Math.max(min, pulled))
    }, intervalMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    timer = null
  })

  return value
}
