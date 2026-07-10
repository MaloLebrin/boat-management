/**
 * Données géographiques décoratives de `PortsMapCanvas` : contours
 * grossiers des continents (paires plates `[lon0, lat0, lon1, lat1, …]`,
 * précision volontairement basse — la carte est un motif de fond en
 * pointillés, pas une carte exacte), ports plaisance/charter et routes.
 * Les côtes atlantique et méditerranéenne sont un peu plus détaillées
 * (marque nautique française).
 */

const NORTH_AMERICA = [
  -165, 66, -150, 71, -128, 70, -105, 72, -85, 69, -70, 62, -55, 52, -65, 45, -70, 42, -76, 35, -81,
  31, -80, 26, -84, 30, -90, 29, -96, 27, -97, 22, -94, 18, -88, 16, -83, 9, -79, 9, -92, 15, -97,
  16, -105, 20, -110, 24, -117, 33, -123, 39, -125, 45, -128, 51, -133, 57, -140, 60, -152, 60,
  -160, 56, -166, 62,
]

const SOUTH_AMERICA = [
  -79, 9, -76, 8, -71, 12, -63, 10, -52, 5, -50, 0, -44, -3, -37, -5, -35, -8, -39, -13, -41, -22,
  -48, -26, -53, -34, -58, -39, -65, -41, -66, -47, -69, -52, -74, -53, -75, -46, -73, -37, -71,
  -30, -70, -18, -76, -14, -81, -6, -80, 0, -77, 4,
]

const EUROPE = [
  -9, 37, -6, 36, -2, 36, 0, 38, 1, 41, 3, 42, 5, 43, 7, 44, 10, 44, 13, 45, 14, 42, 16, 40, 15, 38,
  17, 39, 19, 42, 19, 40, 21, 38, 23, 36, 24, 38, 23, 40, 26, 41, 29, 41, 28, 45, 30, 46, 33, 45,
  36, 45, 39, 47, 40, 50, 37, 54, 30, 55, 28, 59, 30, 60, 28, 61, 25, 65, 28, 70, 24, 71, 18, 69,
  14, 68, 12, 65, 8, 63, 5, 62, 5, 60, 7, 58, 8, 56, 10, 57, 12, 56, 10, 54, 7, 53, 4, 52, 1, 51,
  -2, 50, -5, 48, -2, 47, -1, 45, -2, 44, -8, 43,
]

const BRITISH_ISLES = [-5, 50, 1, 51, 0, 53, -2, 56, -4, 58, -6, 56, -5, 54, -3, 53, -5, 51]

const AFRICA = [
  -6, 35, 3, 37, 10, 37, 11, 33, 19, 32, 25, 32, 32, 31, 34, 28, 38, 22, 43, 12, 47, 11, 51, 12, 46,
  0, 40, -3, 35, -18, 33, -26, 28, -33, 20, -35, 18, -32, 14, -23, 12, -15, 9, -1, 9, 4, 4, 6, -4,
  5, -8, 4, -13, 9, -17, 15, -17, 21, -15, 26, -10, 31,
]

const ASIA = [
  26, 40, 30, 37, 34, 32, 35, 28, 40, 19, 45, 12, 55, 14, 60, 24, 56, 27, 49, 30, 57, 27, 62, 25,
  67, 24, 72, 20, 73, 16, 77, 8, 80, 13, 85, 20, 89, 22, 92, 21, 94, 16, 98, 9, 101, 3, 103, 1, 104,
  8, 100, 13, 105, 10, 109, 12, 108, 18, 114, 22, 121, 29, 121, 37, 124, 40, 131, 43, 135, 49, 141,
  53, 152, 59, 160, 66, 170, 66, 178, 65, 170, 71, 160, 70, 140, 73, 110, 74, 90, 73, 72, 68, 60,
  69, 50, 68, 44, 66, 40, 60, 40, 50, 36, 45, 30, 41,
]

const AUSTRALIA = [
  114, -22, 113, -26, 115, -34, 119, -35, 124, -33, 131, -32, 137, -35, 140, -38, 146, -39, 150,
  -37, 153, -31, 153, -26, 149, -21, 146, -19, 142, -11, 140, -17, 136, -15, 132, -11, 126, -14,
  122, -18,
]

const NEW_ZEALAND = [173, -35, 176, -38, 174, -42, 170, -46, 166, -46, 169, -43, 172, -40]

export const WORLD_POLYGONS: number[][] = [
  NORTH_AMERICA,
  SOUTH_AMERICA,
  EUROPE,
  BRITISH_ISLES,
  AFRICA,
  ASIA,
  AUSTRALIA,
  NEW_ZEALAND,
]

export interface PortPoint {
  /** Jamais affiché (décoratif) — lisibilité du code uniquement, pas d'i18n. */
  name: string
  lon: number
  lat: number
}

export const PORTS: PortPoint[] = [
  { name: 'La Rochelle', lon: -1.15, lat: 46.16 },
  { name: 'Marseille', lon: 5.37, lat: 43.3 },
  { name: 'Barcelone', lon: 2.18, lat: 41.38 },
  { name: 'Athènes', lon: 23.6, lat: 37.9 },
  { name: 'Split', lon: 16.4, lat: 43.5 },
  { name: 'Miami', lon: -80.19, lat: 25.77 },
  { name: 'Fort-de-France', lon: -61.06, lat: 14.6 },
  { name: 'Le Cap', lon: 18.42, lat: -33.9 },
  { name: 'Singapour', lon: 103.85, lat: 1.29 },
  { name: 'Auckland', lon: 174.76, lat: -36.85 },
]

/** Paires d'index dans `PORTS` reliées par un arc animé. */
export const ROUTES: Array<[number, number]> = [
  [0, 5],
  [5, 6],
  [0, 2],
  [2, 1],
  [1, 3],
  [7, 8],
  [8, 9],
  [0, 7],
]
