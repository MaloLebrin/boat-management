<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Couleur des nœuds et segments (hex). */
    color?: string
    /** Densité (nœuds pour 100 000 px²). */
    density?: number
  }>(),
  { color: '#8a9aab', density: 0.9 }
)

interface Node {
  x: number
  y: number
  vx: number
  vy: number
}

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let nodes: Node[] = []
let width = 0
let height = 0
let dpr = 1
let running = false
let visible = true
const mouse = { x: -9999, y: -9999 }
const LINK_DIST = 130
let observer: IntersectionObserver | null = null
let onVisibility: (() => void) | null = null
let onResize: (() => void) | null = null
let onMove: ((e: MouseEvent) => void) | null = null
let onLeave: (() => void) | null = null

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function seedNodes() {
  const area = width * height
  const count = Math.min(Math.round((area / 100_000) * props.density), 130)
  nodes = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
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
  seedNodes()
}

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dist = Math.hypot(dx, dy)
      if (dist < LINK_DIST) {
        ctx.strokeStyle = hexToRgba(props.color, (1 - dist / LINK_DIST) * 0.45)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
    ctx.fillStyle = hexToRgba(props.color, 0.95)
    ctx.beginPath()
    ctx.arc(a.x, a.y, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function step() {
  if (!running) return
  for (const n of nodes) {
    n.x += n.vx
    n.y += n.vy
    if (n.x < 0 || n.x > width) n.vx *= -1
    if (n.y < 0 || n.y > height) n.vy *= -1
    // attraction douce vers la souris
    const dx = mouse.x - n.x
    const dy = mouse.y - n.y
    const dist = Math.hypot(dx, dy)
    if (dist < 160 && dist > 0.5) {
      n.x += (dx / dist) * 0.5
      n.y += (dy / dist) * 0.5
    }
  }
  draw()
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
  if (!ctx) return
  resize()
  draw() // frame statique (reduced-motion)

  onResize = () => resize()
  window.addEventListener('resize', onResize, { passive: true })

  onMove = (e: MouseEvent) => {
    const rect = el.getBoundingClientRect()
    mouse.x = e.clientX - rect.left
    mouse.y = e.clientY - rect.top
  }
  onLeave = () => {
    mouse.x = -9999
    mouse.y = -9999
  }
  el.addEventListener('mousemove', onMove)
  el.addEventListener('mouseleave', onLeave)

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
  const el = canvas.value
  if (onResize) window.removeEventListener('resize', onResize)
  if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
  if (onMove) el?.removeEventListener('mousemove', onMove)
  if (onLeave) el?.removeEventListener('mouseleave', onLeave)
})
</script>

<template>
  <canvas ref="canvas" class="absolute inset-0 h-full w-full" aria-hidden="true" />
</template>
