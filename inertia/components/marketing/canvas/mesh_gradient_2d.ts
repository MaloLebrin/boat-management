import type { CanvasRenderer } from '~/composables/use_canvas_lifecycle'
import { MESH_PALETTES, hexToRgba, type MeshVariant } from './mesh_gradient_shared'

interface Blob {
  x: number
  y: number
  r: number
  color: string
  dx: number
  dy: number
  phase: number
}

/**
 * Moteur canvas 2D : 4–5 blobs radiaux qui dérivent lentement (repli quand
 * WebGL est indisponible — rendu historique du hero). Retourne `null` si le
 * contexte 2D est indisponible (jsdom / happy-dom) → repli CSS.
 */
export function createBlobMeshRenderer(
  canvas: HTMLCanvasElement,
  variant: MeshVariant,
  intensity: number
): CanvasRenderer | null {
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = canvas.getContext('2d')
  } catch {
    ctx = null
  }
  if (!ctx) return null

  const palette = MESH_PALETTES[variant]
  // Sur fond clair, le blending additif (`lighter`) sature vers le blanc :
  // on reste en `source-over` avec un alpha réduit.
  const additive = palette.mode === 'dark'
  const alpha = additive ? intensity : intensity * 0.5
  let blobs: Blob[] = []
  let width = 0
  let height = 0

  function seedBlobs() {
    const colors = palette.colors
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

  return {
    resize(w, h, dpr) {
      width = w
      height = h
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
      seedBlobs()
    },
    drawFrame(t) {
      if (!ctx) return
      for (const b of blobs) {
        b.x += b.dx
        b.y += b.dy
        if (b.x < -b.r * 0.5 || b.x > width + b.r * 0.5) b.dx *= -1
        if (b.y < -b.r * 0.5 || b.y > height + b.r * 0.5) b.dy *= -1
      }
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over'
      for (const b of blobs) {
        const cx = b.x + Math.sin(t * 0.0004 + b.phase) * 40
        const cy = b.y + Math.cos(t * 0.0003 + b.phase) * 40
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r)
        grad.addColorStop(0, hexToRgba(b.color, alpha))
        grad.addColorStop(1, hexToRgba(b.color, 0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, b.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    },
    destroy() {
      blobs = []
      ctx = null
    },
  }
}
