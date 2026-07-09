import { onMounted, onUnmounted, ref, type Ref } from 'vue'

interface TiltOptions {
  /** Amplitude maximale de rotation en degrés. */
  max?: number
  /** Élévation (translateZ) appliquée au survol, en px. */
  lift?: number
  /** Facteur de parallaxe au scroll (0 = désactivé). */
  parallax?: number
}

/**
 * Inclinaison 3D d'un élément suivant la position de la souris (effet « carte
 * Stripe ») + légère parallaxe verticale au scroll. Applique une `transform`
 * inline via une variable réactive. No-op en SSR et sous `prefers-reduced-motion`.
 */
export function useTilt(options: TiltOptions = {}) {
  const { max = 8, lift = 0, parallax = 0 } = options

  const el: Ref<HTMLElement | null> = ref(null)
  const transform = ref('')
  let scrollHandler: (() => void) | null = null
  let scrollOffset = 0

  function reducedMotion() {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  function compose(rx: number, ry: number) {
    transform.value = `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(
      2
    )}deg) translateY(${(-scrollOffset).toFixed(1)}px) translateZ(${lift}px)`
  }

  function onMove(event: MouseEvent) {
    const node = el.value
    if (!node) return
    const rect = node.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    compose(-py * max, px * max)
  }

  function onLeave() {
    compose(0, 0)
  }

  function onScroll() {
    const node = el.value
    if (!node || parallax === 0) return
    const rect = node.getBoundingClientRect()
    const viewportCenter = window.innerHeight / 2
    const elementCenter = rect.top + rect.height / 2
    scrollOffset = ((elementCenter - viewportCenter) / window.innerHeight) * parallax * 40
    compose(0, 0)
  }

  onMounted(() => {
    const node = el.value
    if (!node || reducedMotion()) return
    node.addEventListener('mousemove', onMove)
    node.addEventListener('mouseleave', onLeave)
    if (parallax !== 0) {
      scrollHandler = onScroll
      window.addEventListener('scroll', scrollHandler, { passive: true })
      onScroll()
    }
  })

  onUnmounted(() => {
    const node = el.value
    node?.removeEventListener('mousemove', onMove)
    node?.removeEventListener('mouseleave', onLeave)
    if (scrollHandler) window.removeEventListener('scroll', scrollHandler)
  })

  return { el, transform }
}
