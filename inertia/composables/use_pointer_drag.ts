import { onBeforeUnmount, ref, shallowRef } from 'vue'

/** Distance (px) à parcourir avant qu'un appui devienne un glisser : en deçà, c'est un clic. */
const DRAG_THRESHOLD_PX = 6

export interface PointerDragOptions<T> {
  /** Appelé au lâcher au-dessus d'une zone `[data-drop-zone]`, avec sa valeur. */
  onDrop: (item: T, zone: string) => void
}

/**
 * Glisser-déposer aux Pointer Events (#869) : une seule implémentation pour la
 * souris, le stylet et le doigt — le `draggable` HTML5 ignore le tactile.
 *
 * Les cibles se déclarent dans le template par `data-drop-zone="<valeur>"` ;
 * la zone survolée est retrouvée par `elementFromPoint`, ce qui marche aussi
 * pendant la capture du pointeur. L'élément saisi doit porter
 * `touch-action: none` (sinon le navigateur défile au lieu de glisser).
 * Échap annule.
 */
export function usePointerDrag<T>(options: PointerDragOptions<T>) {
  const dragged = shallowRef<T | null>(null)
  /** Décalage du pointeur depuis l'appui, pour translater l'élément saisi. */
  const offset = ref({ x: 0, y: 0 })
  const hoveredZone = ref<string | null>(null)

  let origin: { x: number; y: number } | null = null
  let candidate: T | null = null
  let moved = false

  function zoneAt(x: number, y: number): string | null {
    if (typeof document === 'undefined') return null
    const element = document.elementFromPoint(x, y)
    const zone = element?.closest<HTMLElement>('[data-drop-zone]')
    return zone?.dataset.dropZone ?? null
  }

  function onMove(event: PointerEvent) {
    if (!origin || candidate === null) return
    const dx = event.clientX - origin.x
    const dy = event.clientY - origin.y
    if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
    moved = true
    dragged.value = candidate
    offset.value = { x: dx, y: dy }
    hoveredZone.value = zoneAt(event.clientX, event.clientY)
  }

  function onUp(event: PointerEvent) {
    const item = candidate
    const zone = moved ? zoneAt(event.clientX, event.clientY) : null
    const wasDrag = moved
    reset()
    if (wasDrag) swallowNextClick()
    if (item !== null && zone !== null) options.onDrop(item, zone)
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') reset()
  }

  /** Le lâcher d'un glisser déclenche un `click` sur l'élément : il ne doit pas naviguer. */
  function swallowNextClick() {
    const swallow = (event: MouseEvent) => {
      event.stopPropagation()
      event.preventDefault()
    }
    window.addEventListener('click', swallow, { capture: true, once: true })
    // Aucun clic ne suit (lâcher hors de l'élément) : ne pas manger le suivant.
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
  }

  function listen(on: boolean) {
    if (typeof window === 'undefined') return
    if (on) {
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', reset)
      window.addEventListener('keydown', onKey)
    } else {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', reset)
      window.removeEventListener('keydown', onKey)
    }
  }

  function reset() {
    listen(false)
    origin = null
    candidate = null
    moved = false
    dragged.value = null
    offset.value = { x: 0, y: 0 }
    hoveredZone.value = null
  }

  /** À brancher sur `@pointerdown` de l'élément (ou de sa poignée). */
  function start(event: PointerEvent, item: T) {
    // Bouton principal seulement : le clic droit ouvre un menu, pas un glisser.
    if (event.button !== 0) return
    reset()
    origin = { x: event.clientX, y: event.clientY }
    candidate = item
    listen(true)
  }

  onBeforeUnmount(reset)

  return { dragged, offset, hoveredZone, start, cancel: reset }
}
