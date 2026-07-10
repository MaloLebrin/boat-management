/**
 * Briques partagées du dégradé maillé de hero (« Stripe-like ») :
 * variantes/palettes calées sur les tokens `app.css` et helpers couleur,
 * consommées par les moteurs WebGL (`mesh_gradient_webgl.ts`) et
 * canvas 2D (`mesh_gradient_2d.ts`).
 */

export type MeshVariant = 'navy' | 'sunset' | 'ocean' | 'dawn'

export interface MeshPalette {
  colors: string[]
  /** `dark` : fond navy, blobs additifs. `light` : fond cream, alpha réduit. */
  mode: 'dark' | 'light'
}

// Palettes calées sur les tokens `app.css` (navy hull, coral, violet IA, sky, mint).
export const MESH_PALETTES: Record<MeshVariant, MeshPalette> = {
  navy: { colors: ['#2a527a', '#3d6f9c', '#5a4a8a', '#e2674f', '#1a3a55'], mode: 'dark' },
  sunset: { colors: ['#e2674f', '#ea7f6a', '#5a4a8a', '#3d6f9c', '#c84a3a'], mode: 'dark' },
  ocean: { colors: ['#3d6f9c', '#56697d', '#5a4a8a', '#2a527a', '#7dd3fc'], mode: 'dark' },
  dawn: { colors: ['#7dd3fc', '#e0dcec', '#fadcd2', '#cfe8de', '#dde7f0'], mode: 'light' },
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb255(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function hexToRgb255(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  return [
    Number.parseInt(v.slice(0, 2), 16),
    Number.parseInt(v.slice(2, 4), 16),
    Number.parseInt(v.slice(4, 6), 16),
  ]
}

/** Composantes 0–1 pour les uniforms WebGL. */
export function hexToRgb01(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb255(hex)
  return [r / 255, g / 255, b / 255]
}
