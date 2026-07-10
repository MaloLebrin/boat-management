import { describe, expect, test } from 'vitest'
import {
  buildDots,
  pointInPolygon,
  projectLonLat,
} from '../../inertia/components/marketing/canvas/ports_map_renderer'
import {
  PORTS,
  ROUTES,
  WORLD_POLYGONS,
} from '../../inertia/components/marketing/canvas/world_map_data'

describe('pointInPolygon', () => {
  // Carré [0,10]×[0,10] en coordonnées plates.
  const square = [0, 0, 10, 0, 10, 10, 0, 10]

  test('point au centre → dedans', () => {
    expect(pointInPolygon(5, 5, square)).toBe(true)
  })

  test('point dehors → false', () => {
    expect(pointInPolygon(15, 5, square)).toBe(false)
    expect(pointInPolygon(-1, -1, square)).toBe(false)
  })

  test('point proche du bord intérieur → dedans', () => {
    expect(pointInPolygon(9.99, 5, square)).toBe(true)
    expect(pointInPolygon(0.01, 0.01, square)).toBe(true)
  })
})

describe('projectLonLat', () => {
  test('lon 0 tombe au milieu horizontal du canvas', () => {
    const { x } = projectLonLat(0, 0, 1000, 500)
    expect(x).toBe(500)
  })

  test('les bornes lon/lat restent dans le canvas', () => {
    const a = projectLonLat(-180, 70, 1000, 500)
    const b = projectLonLat(180, -45, 1000, 500)
    expect(a.x).toBe(0)
    expect(b.x).toBe(1000)
    expect(a.y).toBeGreaterThanOrEqual(0)
    expect(b.y).toBeLessThanOrEqual(500)
  })

  test('la latitude décroît vers le bas du canvas', () => {
    const north = projectLonLat(0, 45, 1000, 500)
    const south = projectLonLat(0, -30, 1000, 500)
    expect(north.y).toBeLessThan(south.y)
  })
})

describe('buildDots', () => {
  test('retourne des points avec les polygones monde', () => {
    const dots = buildDots(800, 400, 12)
    expect(dots.length).toBeGreaterThan(100)
    for (const dot of dots.slice(0, 10)) {
      expect(dot.x).toBeGreaterThanOrEqual(0)
      expect(dot.x).toBeLessThanOrEqual(800)
      expect(dot.y).toBeGreaterThanOrEqual(0)
      expect(dot.y).toBeLessThanOrEqual(400)
    }
  })

  test('aucun point sans polygone', () => {
    expect(buildDots(800, 400, 12, [])).toHaveLength(0)
  })

  test('dimensions nulles → aucun point, pas de boucle infinie', () => {
    expect(buildDots(0, 0, 12)).toHaveLength(0)
  })
})

describe('world_map_data', () => {
  test('chaque route référence des ports valides', () => {
    for (const [a, b] of ROUTES) {
      expect(PORTS[a]).toBeDefined()
      expect(PORTS[b]).toBeDefined()
      expect(a).not.toBe(b)
    }
  })

  test('les polygones sont des listes plates de paires', () => {
    for (const poly of WORLD_POLYGONS) {
      expect(poly.length % 2).toBe(0)
      expect(poly.length).toBeGreaterThanOrEqual(6)
    }
  })

  test('les ports sont dans les bornes lon/lat', () => {
    for (const port of PORTS) {
      expect(port.lon).toBeGreaterThanOrEqual(-180)
      expect(port.lon).toBeLessThanOrEqual(180)
      expect(port.lat).toBeGreaterThanOrEqual(-50)
      expect(port.lat).toBeLessThanOrEqual(70)
    }
  })
})
