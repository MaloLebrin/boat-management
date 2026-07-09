import { onMounted, onUnmounted, ref, type Ref } from 'vue'

interface MagneticOptions {
  /** Intensité de l'attraction (fraction du décalage curseur). */
  strength?: number
  /** Décalage maximal en px. */
  max?: number
}

/**
 * Effet « bouton magnétique » (façon stripe.com) : l'élément suit légèrement le
 * curseur quand il le survole, puis revient à sa position. Applique une
 * `transform` inline via une variable réactive.
 * No-op en SSR et sous `prefers-reduced-motion`.
 */
export function useMagnetic(options: MagneticOptions = {}) {
  const { strength = 0.35, max = 12 } = options

  const el: Ref<HTMLElement | null> = ref(null)
  const transform = ref('')

  function reducedMotion() {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  function clamp(v: number) {
    return Math.min(max, Math.max(-max, v))
  }

  function onMove(event: MouseEvent) {
    const node = el.value
    if (!node) return
    const rect = node.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    transform.value = `translate(${clamp(dx * strength).toFixed(1)}px, ${clamp(
      dy * strength
    ).toFixed(1)}px)`
  }

  function onLeave() {
    transform.value = 'translate(0px, 0px)'
  }

  onMounted(() => {
    const node = el.value
    if (!node || reducedMotion()) return
    node.addEventListener('mousemove', onMove)
    node.addEventListener('mouseleave', onLeave)
  })

  onUnmounted(() => {
    const node = el.value
    node?.removeEventListener('mousemove', onMove)
    node?.removeEventListener('mouseleave', onLeave)
  })

  return { el, transform }
}
