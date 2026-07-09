import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Suit la position du curseur au-dessus d'un élément et l'expose en variables
 * CSS (`--card-mouse-x` / `--card-mouse-y`), façon carte bento Stripe : un
 * liseré lumineux s'illumine à l'endroit du pointeur (cf. `.glow-border` dans
 * `app.css`). SSR-safe (accès `window` uniquement dans `onMounted`).
 */
export function usePointerGlow() {
  const el = ref<HTMLElement | null>(null)
  let onMove: ((e: PointerEvent) => void) | null = null
  let onLeave: (() => void) | null = null

  onMounted(() => {
    const node = el.value
    if (!node || typeof window === 'undefined') return

    onMove = (e) => {
      const rect = node.getBoundingClientRect()
      node.style.setProperty('--card-mouse-x', `${e.clientX - rect.left}px`)
      node.style.setProperty('--card-mouse-y', `${e.clientY - rect.top}px`)
    }
    onLeave = () => {
      node.style.removeProperty('--card-mouse-x')
      node.style.removeProperty('--card-mouse-y')
    }

    node.addEventListener('pointermove', onMove, { passive: true })
    node.addEventListener('pointerleave', onLeave)
  })

  onUnmounted(() => {
    const node = el.value
    if (onMove) node?.removeEventListener('pointermove', onMove)
    if (onLeave) node?.removeEventListener('pointerleave', onLeave)
  })

  return { el }
}
