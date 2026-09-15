import type { EngineStrokeType } from '#shared/types/engine_catalog'

/**
 * Cycle moteur (2 temps / 4 temps) à afficher à côté du nom d'un moteur.
 *
 * Le cycle est l'information la plus discriminante pour un plaisancier (huile,
 * pièces, entretien) : on l'affiche donc **le plus souvent possible**, en le
 * déduisant quand il n'est pas saisi — mais jamais en l'inventant.
 */

/** Signature minimale d'un moteur, côté base comme côté props Inertia. */
export interface EngineStrokeSignals {
  strokeType?: string | null
  family?: string | null
  fuel?: string | null
  kind?: string | null
}

/** Familles de motorisation dont le cycle est certain (hors hors-bord). */
const FOUR_STROKE_FAMILIES: ReadonlySet<string> = new Set([
  'inboard_diesel_shaft',
  'inboard_diesel_saildrive',
  'inboard_petrol',
  'sterndrive',
  'pod_drive',
])

/**
 * Cycle retenu pour l'affichage, par ordre de fiabilité :
 *
 * 1. `strokeType` saisi sur le moteur ;
 * 2. rien pour un moteur électrique ou hybride — la notion n'a pas de sens ;
 * 3. la famille hors-bord (`outboard_2t` / `outboard_4t`) ;
 * 4. un 4 temps pour un diesel, un in-bord essence, une embase Z ou un pod : le
 *    2 temps n'existe pratiquement pas sur ces installations de plaisance.
 *
 * Un hors-bord essence sans cycle ni famille, un jet ou un groupe électrogène
 * essence restent sans cycle (`null`) : les deux sont courants.
 */
export function resolveEngineStrokeType(engine: EngineStrokeSignals): EngineStrokeType | null {
  if (engine.strokeType === '2_stroke' || engine.strokeType === '4_stroke') {
    return engine.strokeType
  }

  const family = engine.family ?? null
  const fuel = engine.fuel ?? null

  if (fuel === 'electric' || engine.kind === 'electric' || engine.kind === 'hybrid') return null
  if (family === 'electric_outboard' || family === 'electric_inboard' || family === 'hybrid') {
    return null
  }

  if (family === 'outboard_2t') return '2_stroke'
  if (family === 'outboard_4t') return '4_stroke'
  if (family !== null && FOUR_STROKE_FAMILIES.has(family)) return '4_stroke'

  if (fuel === 'diesel') return '4_stroke'
  if (engine.kind === 'inboard' && fuel === 'essence') return '4_stroke'

  return null
}

/**
 * Notation courte du cycle, identique en français et en anglais (« 2T », « 4T »).
 * Réservée aux libellés backend sans i18n (roster de l'assistant) ; l'UI passe
 * par la clé `boats.options.strokeTypeShort.*`.
 */
export const ENGINE_STROKE_SHORT_LABELS: Readonly<Record<EngineStrokeType, string>> = {
  '2_stroke': '2T',
  '4_stroke': '4T',
}

/**
 * Ajoute le suffixe de cycle (« · 2T » ou « · 4T ») à un libellé moteur quand le
 * cycle peut être déduit. Builder pur, adapté au prompt système de l'assistant et
 * aux libellés PDF — jamais stocké.
 *
 * @param label - Libellé existant (marque + modèle, ou fallback)
 * @param engine - Signaux permettant la déduction du cycle
 * @returns Le libellé enrichi, ou inchangé si le cycle est indécidable
 */
export function engineLabelWithStroke(label: string, engine: EngineStrokeSignals): string {
  const strokeType = resolveEngineStrokeType(engine)
  if (strokeType === null) return label
  return `${label} · ${ENGINE_STROKE_SHORT_LABELS[strokeType]}`
}
