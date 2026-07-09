import type { CanvasRenderer } from '~/composables/use_canvas_lifecycle'
import { hexToRgba } from './mesh_gradient_shared'
import { PORTS, ROUTES, WORLD_POLYGONS } from './world_map_data'

/**
 * Carte du monde pointillée + arcs de routes maritimes (inspirée du globe
 * de stripe.com, à plat) : les continents deviennent une grille hexagonale
 * de points (précalculée dans un canvas offscreen à chaque resize — le
 * dessin par frame se réduit à un `drawImage` + les arcs), des « comètes »
 * parcourent des Bézier quadratiques entre les ports.
 */

export type PortsMapTheme = 'dark' | 'light'

interface Point {
  x: number
  y: number
}

// Bande de latitudes projetée (coupe l'Antarctique et l'extrême Arctique).
const LAT_TOP = 74
const LAT_BOTTOM = -50

interface ThemeColors {
  dot: string
  dotAlpha: number
  arc: string
  arcAlpha: number
  port: string
}

const THEMES: Record<PortsMapTheme, ThemeColors> = {
  dark: { dot: '#8fa3b8', dotAlpha: 0.5, arc: '#e2674f', arcAlpha: 1, port: '#faf6ee' },
  light: { dot: '#2a527a', dotAlpha: 0.28, arc: '#e2674f', arcAlpha: 0.55, port: '#2a527a' },
}

/** Projection équirectangulaire vers les coordonnées CSS du canvas. */
export function projectLonLat(lon: number, lat: number, width: number, height: number) {
  return {
    x: ((lon + 180) / 360) * width,
    y: ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * height,
  }
}

/** Ray casting sur un polygone plat `[x0, y0, x1, y1, …]`. */
export function pointInPolygon(x: number, y: number, flatCoords: number[]) {
  let inside = false
  const count = flatCoords.length / 2
  for (let i = 0, j = count - 1; i < count; j = i, i += 1) {
    const xi = flatCoords[i * 2]
    const yi = flatCoords[i * 2 + 1]
    const xj = flatCoords[j * 2]
    const yj = flatCoords[j * 2 + 1]
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

/**
 * Grille hexagonale de pas `spacing` (px CSS) filtrée par appartenance aux
 * continents (test en lon/lat — la projection est linéaire).
 */
export function buildDots(
  width: number,
  height: number,
  spacing: number,
  polygons: number[][] = WORLD_POLYGONS
) {
  const dots: Array<{ x: number; y: number }> = []
  if (width <= 0 || height <= 0) return dots
  let row = 0
  for (let y = spacing / 2; y < height; y += spacing * 0.86, row += 1) {
    const offset = row % 2 === 0 ? 0 : spacing / 2
    for (let x = spacing / 2 + offset; x < width; x += spacing) {
      const lon = (x / width) * 360 - 180
      const lat = LAT_TOP - (y / height) * (LAT_TOP - LAT_BOTTOM)
      if (polygons.some((poly) => pointInPolygon(lon, lat, poly))) dots.push({ x, y })
    }
  }
  return dots
}

export function createPortsMapRenderer(
  canvas: HTMLCanvasElement,
  theme: PortsMapTheme,
  intensity: number
): CanvasRenderer | null {
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = canvas.getContext('2d')
  } catch {
    ctx = null
  }
  if (!ctx) return null

  const colors = THEMES[theme]
  let width = 0
  let height = 0
  let offscreen: HTMLCanvasElement | null = null
  let ports: Array<{ x: number; y: number }> = []

  function arcControl(a: Point, b: Point): Point {
    // Point de contrôle : milieu décalé le long de la perpendiculaire
    // orientée vers le haut → l'arc bombe vers le nord, façon route aérienne.
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const lift = len * 0.18
    let px = dy / len
    let py = -dx / len
    if (py > 0) {
      px = -px
      py = -py
    }
    return { x: mx + px * lift, y: my + py * lift }
  }

  function bezierPoint(a: Point, c: Point, b: Point, t: number): Point {
    const u = 1 - t
    return {
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    }
  }

  function buildOffscreen(dpr: number) {
    offscreen = document.createElement('canvas')
    offscreen.width = Math.max(1, Math.floor(width * dpr))
    offscreen.height = Math.max(1, Math.floor(height * dpr))
    const off = offscreen.getContext('2d')
    if (!off) return
    off.setTransform(dpr, 0, 0, dpr, 0, 0)
    off.fillStyle = hexToRgba(colors.dot, colors.dotAlpha * intensity)
    const spacing = Math.min(Math.max(width / 90, 9), 14)
    for (const dot of buildDots(width, height, spacing)) {
      off.beginPath()
      off.arc(dot.x, dot.y, 1.1, 0, Math.PI * 2)
      off.fill()
    }
  }

  function drawArcsAndPorts(timeSec: number) {
    if (!ctx) return
    for (const [i, ROUTE] of ROUTES.entries()) {
      const a = ports[ROUTE[0]]
      const b = ports[ROUTE[1]]
      if (!a || !b) continue
      const c = arcControl(a, b)
      ctx.strokeStyle = hexToRgba(colors.arc, 0.16 * colors.arcAlpha * intensity)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo(c.x, c.y, b.x, b.y)
      ctx.stroke()
      if (timeSec > 0) drawComet(a, c, b, timeSec, i)
    }
    for (const [i, p] of ports.entries()) {
      const pulse = timeSec > 0 ? Math.sin(timeSec * 2 + i * 1.7) * 0.7 : 0
      ctx.fillStyle = hexToRgba(colors.port, 0.85 * intensity)
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2 + pulse * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawComet(a: Point, c: Point, b: Point, timeSec: number, routeIndex: number) {
    if (!ctx) return
    const progress = (timeSec / 4 + routeIndex * 0.35) % 1
    const tail = Math.max(progress - 0.12, 0)
    if (progress <= 0.001) return
    const head = bezierPoint(a, c, b, progress)
    const rear = bezierPoint(a, c, b, tail)
    const grad = ctx.createLinearGradient(rear.x, rear.y, head.x, head.y)
    grad.addColorStop(0, hexToRgba(colors.arc, 0))
    grad.addColorStop(1, hexToRgba(colors.arc, 0.9 * colors.arcAlpha * intensity))
    ctx.strokeStyle = grad
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(rear.x, rear.y)
    const steps = 10
    for (let s = 1; s <= steps; s += 1) {
      const pt = bezierPoint(a, c, b, tail + ((progress - tail) * s) / steps)
      ctx.lineTo(pt.x, pt.y)
    }
    ctx.stroke()
    ctx.fillStyle = hexToRgba(colors.arc, colors.arcAlpha * intensity)
    ctx.beginPath()
    ctx.arc(head.x, head.y, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }

  return {
    resize(w, h, dpr) {
      width = w
      height = h
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
      ports = PORTS.map((p) => projectLonLat(p.lon, p.lat, width, height))
      buildOffscreen(dpr)
    },
    drawFrame(timeMs) {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      if (offscreen) ctx.drawImage(offscreen, 0, 0, width, height)
      // timeMs = 0 → frame statique (montage initial et reduced-motion) :
      // points + arcs + ports, sans comètes ni pulsation.
      drawArcsAndPorts(timeMs / 1000)
    },
    destroy() {
      offscreen = null
      ctx = null
    },
  }
}
