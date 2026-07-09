<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

type MeshVariant = 'navy' | 'sunset' | 'ocean'

const props = withDefaults(
  defineProps<{
    variant?: MeshVariant
    /** Intensité globale (opacité des blobs), 0–1. */
    intensity?: number
  }>(),
  { variant: 'navy', intensity: 0.55 }
)

interface Blob {
  x: number
  y: number
  r: number
  color: string
  dx: number
  dy: number
  phase: number
}

// Palettes calées sur les tokens `app.css` (navy hull, coral, violet IA, sky).
const PALETTES: Record<MeshVariant, string[]> = {
  navy: ['#2a527a', '#3d6f9c', '#5a4a8a', '#e2674f', '#1a3a55'],
  sunset: ['#e2674f', '#ea7f6a', '#5a4a8a', '#3d6f9c', '#c84a3a'],
  ocean: ['#3d6f9c', '#56697d', '#5a4a8a', '#2a527a', '#7dd3fc'],
}

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let blobs: Blob[] = []
let width = 0
let height = 0
let dpr = 1
let running = false
let observer: IntersectionObserver | null = null
let visible = true
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
  const colors = PALETTES[props.variant]
  const count = width < 640 ? 4 : 5
  blobs = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.max(width, height) * (0.28 + Math.random() * 0.22),
    color: colors[i % colors.length],
    dx: (Math.random() - 0.5) * 0.22,
    dy: (Math.random() - 0.5) * 0.22,
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

function draw(t: number) {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  ctx.globalCompositeOperation = 'lighter'
  for (const b of blobs) {
    const wobble = Math.sin(t * 0.0004 + b.phase) * 40
    const cx = b.x + wobble
    const cy = b.y + Math.cos(t * 0.0003 + b.phase) * 40
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r)
    grad.addColorStop(0, hexToRgba(b.color, props.intensity))
    grad.addColorStop(1, hexToRgba(b.color, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, b.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
}

function step(t: number) {
  if (!running) return
  for (const b of blobs) {
    b.x += b.dx
    b.y += b.dy
    if (b.x < -b.r * 0.5 || b.x > width + b.r * 0.5) b.dx *= -1
    if (b.y < -b.r * 0.5 || b.y > height + b.r * 0.5) b.dy *= -1
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

function hexToRgba(hex: string, alpha: number) {
  const v = hex.replace('#', '')
  const r = Number.parseInt(v.slice(0, 2), 16)
  const g = Number.parseInt(v.slice(2, 4), 16)
  const b = Number.parseInt(v.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

onMounted(() => {
  const el = canvas.value
  if (!el) return
  try {
    ctx = el.getContext('2d')
  } catch {
    ctx = null
  }
  if (!ctx) return // jsdom / navigateur sans canvas → fond CSS de secours
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
