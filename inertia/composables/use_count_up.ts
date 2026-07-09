import { onMounted, onUnmounted, ref, type Ref } from 'vue'

interface CountUpOptions {
  /** Durée de l'animation en ms. */
  duration?: number
  /** Nombre de décimales à afficher. */
  decimals?: number
  /** Préfixe collé devant la valeur (ex. `€`). */
  prefix?: string
  /** Suffixe collé après la valeur (ex. `%`, `€`, `k`). */
  suffix?: string
  /** Seuil de déclenchement de l'IntersectionObserver. */
  threshold?: number
}

/**
 * Incrémente une valeur de 0 → `target` lorsque l'élément entre dans le viewport.
 * Réutilise le pattern d'`use_scroll_reveal` (IntersectionObserver + déconnexion
 * après la première intersection). Respecte `prefers-reduced-motion` (affiche
 * directement la valeur finale) et le SSR (aucun accès `window` avant `onMounted`).
 */
export function useCountUp(target: number, options: CountUpOptions = {}) {
  const { duration = 1600, decimals = 0, prefix = '', suffix = '', threshold = 0.4 } = options

  const el: Ref<HTMLElement | null> = ref(null)
  const current = ref(0)
  let observer: IntersectionObserver | null = null
  let rafId: number | null = null

  const format = (value: number) => `${prefix}${value.toFixed(decimals)}${suffix}`
  const display = ref(format(0))

  function reducedMotion() {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  function animate() {
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutCubic — décélération premium, cohérente avec --ease-premium
      const eased = 1 - Math.pow(1 - progress, 3)
      current.value = target * eased
      display.value = format(current.value)
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        current.value = target
        display.value = format(target)
        rafId = null
      }
    }
    rafId = requestAnimationFrame(step)
  }

  function settle() {
    current.value = target
    display.value = format(target)
  }

  onMounted(() => {
    if (reducedMotion() || typeof IntersectionObserver === 'undefined' || !el.value) {
      settle()
      return
    }
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer?.disconnect()
          observer = null
          animate()
        }
      },
      { threshold }
    )
    observer.observe(el.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return { el, current, display }
}
