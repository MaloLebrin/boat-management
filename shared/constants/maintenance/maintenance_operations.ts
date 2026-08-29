import type { MaintenanceEngineFamily, MaintenanceOperation } from '#shared/types/maintenance'
import type { MaintenanceSubject } from '#shared/constants/maintenance/maintenance_subjects'

/**
 * Catalogue des opérations de maintenance standard (#581).
 *
 * La mécanique de récurrence (`recurrence_interval_months` /
 * `recurrence_interval_engine_hours`) existait déjà de bout en bout ; ce corpus
 * lui donne son contenu métier : un vocabulaire d'opérations nommées, avec des
 * périodicités indicatives.
 *
 * **Invariants**
 *
 * - `key` est stable à vie : elle préfixe la clé i18n, sert de valeur d'option
 *   dans la combobox et pourra un jour être persistée (`operation_key`). On peut
 *   insérer de nouvelles opérations n'importe où, jamais en renommer une.
 * - `key` est toujours préfixée par son `subject` (`engine.oil_change`).
 * - `labelKey` vaut `maintenance.operations.<key>.label` et existe dans les deux
 *   locales ; `noteKey` vaut `maintenance.operations.<key>.note`.
 * - Les intervalles sont **indicatifs** : ils pré-remplissent un champ vide et
 *   n'écrasent jamais une saisie. Le manuel constructeur reste la référence.
 * - `families` n'écarte que les opérations franchement incohérentes (pas de
 *   bougies sur un diesel). Repli sur `kind`/`fuel` tant que #574 n'est pas
 *   livré — voir `resolveEngineFamily()` dans `#shared/helpers/maintenance_operations`.
 */

const THERMAL: readonly MaintenanceEngineFamily[] = [
  'inboard_diesel',
  'inboard_petrol',
  'outboard_petrol',
  'outboard_diesel',
]
const DIESEL: readonly MaintenanceEngineFamily[] = ['inboard_diesel', 'outboard_diesel']
const PETROL: readonly MaintenanceEngineFamily[] = ['inboard_petrol', 'outboard_petrol']
const INBOARD: readonly MaintenanceEngineFamily[] = ['inboard_diesel', 'inboard_petrol']
const ELECTRIFIED: readonly MaintenanceEngineFamily[] = ['electric', 'hybrid']

/** Construit une opération en dérivant `labelKey` / `noteKey` de la clé. */
function op(
  key: string,
  subject: MaintenanceSubject,
  options: {
    months?: number
    hours?: number
    families?: readonly MaintenanceEngineFamily[]
    note?: boolean
  } = {}
): MaintenanceOperation {
  return {
    key,
    subject,
    labelKey: `maintenance.operations.${key}.label`,
    ...(options.note ? { noteKey: `maintenance.operations.${key}.note` } : {}),
    ...(options.families ? { families: options.families } : {}),
    ...(options.months !== undefined ? { defaultIntervalMonths: options.months } : {}),
    ...(options.hours !== undefined ? { defaultIntervalEngineHours: options.hours } : {}),
  }
}

export const MAINTENANCE_OPERATIONS: readonly MaintenanceOperation[] = [
  // ── Bateau entier ────────────────────────────────────────────────────────
  op('boat.winterizing', 'boat', { months: 12, note: true }),
  op('boat.recommissioning', 'boat', { months: 12 }),
  op('boat.haul_out', 'boat', { months: 12 }),
  op('boat.insurance_survey', 'boat', { months: 60, note: true }),
  op('boat.deep_clean', 'boat', { months: 6 }),
  op('boat.gas_installation', 'boat', { months: 12, note: true }),
  op('boat.documents_check', 'boat', { months: 12 }),

  // ── Coque ────────────────────────────────────────────────────────────────
  op('hull.antifouling', 'hull', { months: 12, note: true }),
  op('hull.anodes', 'hull', { months: 12 }),
  op('hull.thru_hulls', 'hull', { months: 12, note: true }),
  op('hull.saildrive_boot', 'hull', { months: 84, note: true }),
  op('hull.osmosis_check', 'hull', { months: 24 }),
  op('hull.rudder_bearing', 'hull', { months: 12 }),
  op('hull.keel_bolts', 'hull', { months: 24 }),
  op('hull.hull_polish', 'hull', { months: 12 }),
  op('hull.waterline_cleaning', 'hull', { months: 3 }),
  op('hull.propeller_service', 'hull', { months: 12 }),

  // ── Moteur ───────────────────────────────────────────────────────────────
  op('engine.oil_change', 'engine', { months: 12, hours: 100, families: THERMAL, note: true }),
  op('engine.oil_filter', 'engine', { months: 12, hours: 100, families: THERMAL }),
  op('engine.fuel_filter_diesel', 'engine', {
    months: 12,
    hours: 200,
    families: DIESEL,
    note: true,
  }),
  op('engine.fuel_filter_petrol', 'engine', { months: 12, hours: 100, families: PETROL }),
  op('engine.air_filter', 'engine', { months: 12, hours: 200, families: THERMAL }),
  op('engine.impeller', 'engine', { months: 24, hours: 300, families: THERMAL, note: true }),
  op('engine.raw_water_strainer', 'engine', { months: 12, families: INBOARD }),
  op('engine.coolant', 'engine', { months: 24, families: INBOARD }),
  op('engine.heat_exchanger', 'engine', { months: 24, families: INBOARD }),
  op('engine.thermostat', 'engine', { months: 36, families: THERMAL }),
  op('engine.anodes', 'engine', { months: 12, families: THERMAL, note: true }),
  op('engine.belt', 'engine', { months: 12, hours: 400, families: INBOARD }),
  op('engine.spark_plugs', 'engine', { months: 12, hours: 100, families: PETROL }),
  op('engine.gearbox_oil', 'engine', { months: 12, hours: 100, families: THERMAL }),
  op('engine.gearbox_anodes', 'engine', { months: 12, families: THERMAL }),
  op('engine.stern_gland', 'engine', { months: 12, families: INBOARD }),
  op('engine.shaft_alignment', 'engine', { months: 24, families: INBOARD }),
  op('engine.injectors', 'engine', { months: 60, hours: 1000, families: DIESEL, note: true }),
  op('engine.valve_clearance', 'engine', { months: 24, hours: 500, families: THERMAL, note: true }),
  op('engine.exhaust_elbow', 'engine', { months: 60, families: DIESEL, note: true }),
  op('engine.mounts', 'engine', { months: 60, families: INBOARD }),
  op('engine.control_cables', 'engine', { months: 24 }),
  op('engine.winterizing', 'engine', { months: 12, note: true }),
  op('engine.tilt_trim_service', 'engine', {
    months: 12,
    families: ['outboard_petrol', 'outboard_diesel'],
  }),
  op('engine.electric_drive_check', 'engine', { months: 12, families: ELECTRIFIED }),
  op('engine.traction_battery_check', 'engine', { months: 12, families: ELECTRIFIED, note: true }),

  // ── Voiles ───────────────────────────────────────────────────────────────
  op('sail.loft_inspection', 'sail', { months: 12, note: true }),
  op('sail.mainsail_check', 'sail', { months: 12 }),
  op('sail.headsail_uv_strip', 'sail', { months: 36 }),
  op('sail.sail_washing', 'sail', { months: 12 }),
  op('sail.batten_check', 'sail', { months: 12 }),
  op('sail.storm_sails', 'sail', { months: 12 }),

  // ── Gréement ─────────────────────────────────────────────────────────────
  op('rig.standing_rigging_check', 'rig', { months: 12, note: true }),
  op('rig.standing_rigging_replacement', 'rig', { months: 120, note: true }),
  op('rig.running_rigging', 'rig', { months: 60 }),
  op('rig.mast_fittings', 'rig', { months: 12 }),
  op('rig.mast_step', 'rig', { months: 12 }),
  op('rig.furler_service', 'rig', { months: 24 }),
  op('rig.rig_tuning', 'rig', { months: 12 }),
  op('rig.mast_unstepping', 'rig', { months: 60, note: true }),

  // ── Électricité ──────────────────────────────────────────────────────────
  op('electrical.battery_check', 'electrical', { months: 12 }),
  op('electrical.service_battery_bank', 'electrical', { months: 60, note: true }),
  op('electrical.engine_battery', 'electrical', { months: 48 }),
  op('electrical.connections_bonding', 'electrical', { months: 12 }),
  op('electrical.alternator', 'electrical', { months: 12 }),
  op('electrical.shore_power', 'electrical', { months: 12, note: true }),
  op('electrical.navigation_lights', 'electrical', { months: 12 }),
  op('electrical.solar_regulator', 'electrical', { months: 12 }),
  op('electrical.electronics_update', 'electrical', { months: 12 }),

  // ── Plomberie ────────────────────────────────────────────────────────────
  op('plumbing.bilge_pumps', 'plumbing', { months: 12, note: true }),
  op('plumbing.marine_toilet', 'plumbing', { months: 12 }),
  op('plumbing.holding_tank', 'plumbing', { months: 12 }),
  op('plumbing.fresh_water_circuit', 'plumbing', { months: 12 }),
  op('plumbing.water_pump_filter', 'plumbing', { months: 6 }),
  op('plumbing.hoses_clamps', 'plumbing', { months: 24 }),
  op('plumbing.seacocks_grease', 'plumbing', { months: 12 }),
  op('plumbing.watermaker', 'plumbing', { months: 12, note: true }),

  // ── Sécurité ─────────────────────────────────────────────────────────────
  op('safety.liferaft_service', 'safety', { months: 36, note: true }),
  op('safety.fire_extinguishers', 'safety', { months: 12, note: true }),
  op('safety.flares', 'safety', { months: 36, note: true }),
  op('safety.lifejackets', 'safety', { months: 12, note: true }),
  op('safety.epirb_battery', 'safety', { months: 60, note: true }),
  op('safety.harness_lifelines', 'safety', { months: 12 }),
  op('safety.first_aid_kit', 'safety', { months: 12 }),
  op('safety.bilge_alarm', 'safety', { months: 12 }),
  op('safety.sound_signals', 'safety', { months: 12 }),

  // ── Pont et accastillage ────────────────────────────────────────────────
  op('deck.winches', 'deck', { months: 12, note: true }),
  op('deck.windlass', 'deck', { months: 12 }),
  op('deck.anchor_chain', 'deck', { months: 24 }),
  op('deck.hatches_seals', 'deck', { months: 12 }),
  op('deck.teak_care', 'deck', { months: 12 }),
  op('deck.canvas_covers', 'deck', { months: 12 }),
  op('deck.blocks_clutches', 'deck', { months: 12 }),
  op('deck.guardrails', 'deck', { months: 12 }),
  op('deck.steering_system', 'deck', { months: 12, note: true }),

  // ── Autre ────────────────────────────────────────────────────────────────
  op('other.tender_service', 'other', { months: 12 }),
  op('other.outboard_tender_service', 'other', { months: 12 }),
  op('other.trailer_service', 'other', { months: 12, note: true }),
  op('other.heating_service', 'other', { months: 12 }),
  op('other.refrigeration_service', 'other', { months: 12 }),
]

/** Index par clé — l'option retenue dans la combobox porte la clé en valeur. */
export const MAINTENANCE_OPERATION_INDEX: ReadonlyMap<string, MaintenanceOperation> = new Map(
  MAINTENANCE_OPERATIONS.map((operation) => [operation.key, operation])
)

/** Opérations groupées par sujet, dans l'ordre de déclaration du corpus. */
export const MAINTENANCE_OPERATIONS_BY_SUBJECT: Readonly<
  Record<MaintenanceSubject, readonly MaintenanceOperation[]>
> = MAINTENANCE_OPERATIONS.reduce(
  (acc, operation) => {
    acc[operation.subject] = [...acc[operation.subject], operation]
    return acc
  },
  {
    boat: [],
    hull: [],
    engine: [],
    sail: [],
    rig: [],
    electrical: [],
    plumbing: [],
    safety: [],
    deck: [],
    other: [],
  } as Record<MaintenanceSubject, readonly MaintenanceOperation[]>
)
