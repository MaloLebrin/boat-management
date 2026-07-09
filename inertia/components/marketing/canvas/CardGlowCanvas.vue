<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

/**
 * Fond de carte animé (« aurora ») façon stripe.com : quelques taches de couleur
 * douces qui dérivent lentement en boucle derrière le contenu d'une carte.
 * Pensé pour un fond clair (source-over + faible alpha → teinte subtile, pas de
 * sur-brillance). SSR-safe, coupé sous `prefers-reduced-motion`, en pause quand
 * la carte n'est pas visible (IntersectionObserver + visibilitychange).
 */
const props = withDefaults(
  defineProps<{
    /** Couleur dominante des taches (hex). */
    color?: string
    /** Couleur secondaire (hex). */
    color2?: string
    /** Opacité maximale des taches (0–1). */
    intensity?: number
  }>(),
  { color: '#e2674f', color2: '#5a4a8a', intensity: 0.16 }
)

interface Blob {
  x: number
  y: number
  r: number
  dx: number
  dy: number
  color: string
  phase: number
}

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let blobs: Blob[] = []
let width = 0
let height = 0
let dpr = 1
let running = false
let visible = true
let observer: IntersectionObserver | null = null
let onVisibility: (() => void) | null = null
let onResize: (() => void) | null = null

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function seedBlobs() {
  const palette = [props.color, props.color2, props.color]
  blobs = Array.from({ length: 3 }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.max(width, height) * (0.5 + Math.random() * 0.3),
    dx: (Math.random() - 0.5) * 0.25,
    dy: (Math.random() - 0.5) * 0.25,
    color: palette[i % palette.length],
    phase: Math.random() * Math.PI * 2,
  }))
}

function resize() {
  const el = canvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  width = rect.width
  height = rect.height
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.floor(width * dpr)
  el.height = Math.floor(height * dpr)
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  seedBlobs()
}

function hexToRgba(hex: string, alpha: number) {
  const v = hex.replace('#', '')
  const r = Number.parseInt(v.slice(0, 2), 16)
  const g = Number.parseInt(v.slice(2, 4), 16)
  const b = Number.parseInt(v.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function draw(t: number) {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  for (const b of blobs) {
    const cx = b.x + Math.sin(t * 0.0005 + b.phase) * 24
    const cy = b.y + Math.cos(t * 0.0004 + b.phase) * 24
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r)
    grad.addColorStop(0, hexToRgba(b.color, props.intensity))
    grad.addColorStop(1, hexToRgba(b.color, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, b.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function step(t: number) {
  if (!running) return
  for (const b of blobs) {
    b.x += b.dx
    b.y += b.dy
    if (b.x < -b.r * 0.4 || b.x > width + b.r * 0.4) b.dx *= -1
    if (b.y < -b.r * 0.4 || b.y > height + b.r * 0.4) b.dy *= -1
  }
  draw(t)
  rafId = requestAnimationFrame(step)
}

function start() {
  if (running || reducedMotion() || !visible) return
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

onMounted(() => {
  const el = canvas.value
  if (!el) return
  try {
    ctx = el.getContext('2d')
  } catch {
    ctx = null
  }
  if (!ctx) return
  resize()
  draw(0) // frame statique immédiate (couvre reduced-motion)

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

// Re-seed si la couleur change (ex. tab persona).
watch(
  () => [props.color, props.color2],
  () => {
    if (ctx) seedBlobs()
  }
)

onUnmounted(() => {
  stop()
  observer?.disconnect()
  observer = null
  if (onResize) window.removeEventListener('resize', onResize)
  if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <canvas
    ref="canvas"
    class="pointer-events-none absolute inset-0 h-full w-full"
    aria-hidden="true"
  />
</template>
