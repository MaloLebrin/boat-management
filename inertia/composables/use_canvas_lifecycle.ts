import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Contrat minimal d'un moteur de rendu canvas décoratif.
 * `resize` reçoit des dimensions CSS + le devicePixelRatio plafonné,
 * `drawFrame` dessine une frame au timestamp donné (ms), `destroy`
 * libère toutes les ressources (buffers, listeners internes…).
 */
export interface CanvasRenderer {
  resize(width: number, height: number, dpr: number): void
  drawFrame(timeMs: number): void
  destroy(): void
}

export interface CanvasLifecycleOptions {
  /**
   * Plafond du devicePixelRatio (défaut 2 ; 1.5 conseillé pour du WebGL
   * plein écran). Lu à chaque resize : la factory peut l'ajuster selon le
   * moteur effectivement retenu.
   */
  maxDpr?: number
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Cycle de vie commun des canvas marketing (« Stripe-like ») :
 * frame statique immédiate (couvre `prefers-reduced-motion`), boucle rAF
 * mise en pause hors viewport (IntersectionObserver) et onglet caché
 * (`visibilitychange`), re-render au resize, nettoyage complet au démontage.
 * Si `createRenderer` retourne `null` (canvas indisponible, ex. jsdom),
 * le fond CSS de la section sert de repli — aucun crash.
 */
export function useCanvasLifecycle(
  canvasRef: Ref<HTMLCanvasElement | null>,
  createRenderer: (el: HTMLCanvasElement) => CanvasRenderer | null,
  options: CanvasLifecycleOptions = {}
) {
  let renderer: CanvasRenderer | null = null
  let rafId: number | null = null
  let running = false
  let visible = true
  let observer: IntersectionObserver | null = null
  let onVisibility: (() => void) | null = null
  let onResize: (() => void) | null = null

  function step(t: number) {
    if (!running || !renderer) return
    renderer.drawFrame(t)
    rafId = requestAnimationFrame(step)
  }

  function start() {
    if (running || reducedMotion() || !visible || !renderer) return
    running = true
    rafId = requestAnimationFrame(step)
  }

  function stop() {
    running = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function resize() {
    const el = canvasRef.value
    if (!el || !renderer) return
    const rect = el.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, options.maxDpr ?? 2)
    el.width = Math.floor(rect.width * dpr)
    el.height = Math.floor(rect.height * dpr)
    renderer.resize(rect.width, rect.height, dpr)
    renderer.drawFrame(0)
  }

  onMounted(() => {
    const el = canvasRef.value
    if (!el) return
    renderer = createRenderer(el)
    if (!renderer) return

    resize()

    onResize = () => resize()
    window.addEventListener('resize', onResize, { passive: true })

    onVisibility = () => {
      visible = document.visibilityState === 'visible'
      if (visible) start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVisibility)

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting && document.visibilityState === 'visible'
          if (visible) start()
          else stop()
        },
        { threshold: 0 }
      )
      observer.observe(el)
    } else {
      start()
    }
  })

  onUnmounted(() => {
    stop()
    observer?.disconnect()
    observer = null
    if (onResize) window.removeEventListener('resize', onResize)
    if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
    renderer?.destroy()
    renderer = null
  })
}
