/**
 * Cibles AIS (#1009). Unités SI comme le reste de la télémétrie (D8) : vitesse
 * en m/s, cap en rad, CPA en m, TCPA en s.
 */

/** Ce qu'une cible porte dans un relevé (valeur du chemin `ais.<mmsi>`). */
export interface AisTargetValue {
  name: string | null
  latitude: number
  longitude: number
  sogMs: number | null
  cogRad: number | null
  /** Code AIS du type de navire (`design.aisShipType.id`). */
  shipType: number | null
  shipTypeName: string | null
  /** Plus courte distance à venir, `navigation.closestApproach.distance`. */
  cpaM: number | null
  /** Délai avant ce point, `navigation.closestApproach.timeTo`. */
  tcpaS: number | null
}

/** Une cible telle que l'écran la montre. */
export interface AisTarget extends AisTargetValue {
  mmsi: string
  /** ISO 8601 : dernier message reçu (flux) ou relevé (serveur). */
  seenAt: string
  /** Distance au bateau, `null` tant que sa position est inconnue. */
  distanceM: number | null
}

export type AisRisk = 'none' | 'watch' | 'danger'

/** Ligne brute de `boat_ais_sightings` relue par `AisTargetService`. */
export interface AisSightingRow {
  mmsi: string
  recorded_at: Date | string
  name: string | null
  latitude: string | number
  longitude: string | number
  sog_ms: string | number | null
  cog_rad: string | number | null
  ship_type: number | null
  ship_type_name: string | null
  cpa_m: string | number | null
  tcpa_s: string | number | null
}

/** Une ligne prête pour `boat_ais_sightings`. */
export interface AisSightingInsert {
  boat_id: number
  source_id: number
  mmsi: string
  recorded_at: string
  name: string | null
  latitude: number
  longitude: number
  sog_ms: number | null
  cog_rad: number | null
  ship_type: number | null
  ship_type_name: string | null
  cpa_m: number | null
  tcpa_s: number | null
  created_at: string
}
