import { onUnmounted, ref, watch, type Ref } from 'vue'

/**
 * Anime en douceur (easeOutCubic) l'affichage d'un nombre à chaque changement
 * de `source` — pour un total qui « roule » plutôt que de sauter. Jump direct
 * sous `prefers-reduced-motion` ; aucun accès `window` hors navigateur.
 */
export function useTweenNumber(source: Ref<number>, duration = 500) {
  const display = ref(source.value)
  let rafId: number | null = null

  function reducedMotion() {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  watch(source, (to, from) => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    if (reducedMotion() || typeof requestAnimationFrame === 'undefined') {
      display.value = to
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      display.value = from + (to - from) * eased
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        display.value = to
        rafId = null
      }
    }
    rafId = requestAnimationFrame(step)
  })

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return display
}
