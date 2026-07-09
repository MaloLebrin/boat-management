import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * Progression de scroll d'un élément dans le viewport, pour des animations
 * « scroll-linked » (parallax, scale continu…). `progress` ∈ [0, 1] :
 *  - 0 quand le haut de l'élément arrive en bas du viewport,
 *  - 1 quand le bas de l'élément sort par le haut.
 *
 * L'écoute du scroll n'est active que pendant que l'élément est visible
 * (IntersectionObserver), et chaque calcul est throttlé en `requestAnimationFrame`.
 * No-op en SSR et sous `prefers-reduced-motion` (progress figé à 0.5 = neutre).
 */
export function useScrollProgress() {
  const el: Ref<HTMLElement | null> = ref(null)
  const progress = ref(0.5)

  let observer: IntersectionObserver | null = null
  let scrollHandler: (() => void) | null = null
  let rafId: number | null = null
  let active = false

  function reducedMotion() {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  function compute() {
    rafId = null
    const node = el.value
    if (!node) return
    const rect = node.getBoundingClientRect()
    const vh = window.innerHeight || 1
    // 0 → l'élément entre par le bas ; 1 → il sort par le haut.
    const raw = (vh - rect.top) / (vh + rect.height)
    progress.value = Math.min(1, Math.max(0, raw))
  }

  function schedule() {
    if (rafId !== null) return
    rafId = requestAnimationFrame(compute)
  }

  function enable() {
    if (active) return
    active = true
    scrollHandler = schedule
    window.addEventListener('scroll', scrollHandler, { passive: true })
    window.addEventListener('resize', scrollHandler, { passive: true })
    compute()
  }

  function disable() {
    active = false
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler)
      window.removeEventListener('resize', scrollHandler)
      scrollHandler = null
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  onMounted(() => {
    if (!el.value || reducedMotion() || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) enable()
        else disable()
      },
      { threshold: 0 }
    )
    observer.observe(el.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
    disable()
  })

  return { el, progress }
}
