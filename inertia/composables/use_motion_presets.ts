/**
 * Presets de reveal au scroll pour la directive `v-motion` (@vueuse/motion).
 *
 * Chaque preset renvoie `{ initial, visibleOnce }` : l'élément part masqué et
 * décalé, puis rejoue vers son état neutre à la première entrée dans le viewport.
 * On alterne les directions (up / left / right / scale / blur) pour rythmer la
 * page façon stripe.com plutôt qu'un unique fade vertical.
 *
 * Cohérence : easing calé sur `--ease-premium` (cubic-bezier 0.2 0.8 0.2 1) et
 * durée sur `--motion-slow` (~320ms → 600ms ici pour un reveal plus ample).
 *
 * Reduced-motion : détecté au runtime (client + hydratation). Si actif, le preset
 * renvoie un état déjà visible, sans transform ni transition → aucun mouvement.
 */

const EASE_PREMIUM = [0.2, 0.8, 0.2, 1] as const
const DURATION = 600

interface Variant {
  opacity?: number
  x?: number
  y?: number
  scale?: number
  filter?: string
  transition?: Record<string, unknown>
}

export interface MotionPreset {
  initial: Variant
  visibleOnce: Variant
}

function prefersReduced() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function build(from: Variant, delay: number): MotionPreset {
  if (prefersReduced()) {
    return { initial: { opacity: 1 }, visibleOnce: { opacity: 1 } }
  }
  return {
    initial: { opacity: 0, ...from },
    visibleOnce: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: DURATION, delay, ease: EASE_PREMIUM },
    },
  }
}

/** Monte depuis le bas (le classique, comme `.reveal`). */
export function fadeUp(delay = 0): MotionPreset {
  return build({ y: 28 }, delay)
}

/** Entre depuis la gauche. */
export function fadeLeft(delay = 0): MotionPreset {
  return build({ x: -40 }, delay)
}

/** Entre depuis la droite. */
export function fadeRight(delay = 0): MotionPreset {
  return build({ x: 40 }, delay)
}

/** Zoom léger. */
export function scaleIn(delay = 0): MotionPreset {
  return build({ scale: 0.94 }, delay)
}

/** Fondu net (blur → net) avec léger décalage vertical. */
export function blurIn(delay = 0): MotionPreset {
  return build({ y: 16, filter: 'blur(10px)' }, delay)
}
