import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/** Tolérance en px : évite qu'un arrondi subpixel signale un débordement fantôme. */
const OVERFLOW_EPSILON = 2

/** Fraction de la hauteur visible parcourue par un clic sur l'indicateur. */
const SCROLL_STEP_RATIO = 0.8

/**
 * Suit le débordement vertical d'un conteneur scrollable pour pouvoir afficher
 * un indicateur (ombre, dégradé, bouton) quand du contenu reste caché.
 *
 * @param container Élément qui porte le `overflow-y: auto`
 * @param content Élément interne dont la hauteur varie (permet de réagir à un
 *   changement de contenu, pas seulement à un redimensionnement du conteneur)
 */
export function useScrollOverflow(
  container: Ref<HTMLElement | null>,
  content?: Ref<HTMLElement | null>
) {
  const canScrollUp = ref(false)
  const canScrollDown = ref(false)

  let resizeObserver: ResizeObserver | null = null

  function update() {
    const el = container.value
    if (!el) {
      canScrollUp.value = false
      canScrollDown.value = false
      return
    }

    const remaining = el.scrollHeight - el.clientHeight - el.scrollTop
    canScrollUp.value = el.scrollTop > OVERFLOW_EPSILON
    canScrollDown.value = remaining > OVERFLOW_EPSILON
  }

  function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  }

  function scrollDown() {
    const el = container.value
    if (!el) return
    el.scrollBy({
      top: Math.round(el.clientHeight * SCROLL_STEP_RATIO),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  onMounted(() => {
    update()

    container.value?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    if (typeof ResizeObserver === 'undefined') return
    resizeObserver = new ResizeObserver(update)
    if (container.value) resizeObserver.observe(container.value)
    if (content?.value) resizeObserver.observe(content.value)
  })

  onBeforeUnmount(() => {
    container.value?.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return { canScrollUp, canScrollDown, update, scrollDown }
}
