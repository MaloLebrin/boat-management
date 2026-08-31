import { SHEET_TYPES } from '#shared/types/maintenance'
import type {
  MaintenanceSheetTemplate,
  MaintenanceSheetTemplateItem,
  SheetType,
} from '#shared/types/maintenance'

/**
 * Corpus statique des fiches de maintenance guidées (#583), sur le modèle du
 * diagnostic panne (`shared/constants/diagnostic/diagnostic_content.ts`) et de
 * la checklist d'état des lieux (`inspections/inspection_checklist_content.ts`) :
 * des clés stables + des `labelKey` traduits dans les deux locales, jamais de
 * texte en dur.
 *
 * Les `key` des items sont persistées en base
 * (`boat_maintenance_sheet_items.template_key`) et ne doivent JAMAIS être
 * renommées ; on peut en insérer de nouvelles à n'importe quelle position.
 * Chaque clé est préfixée par le type de sa fiche (`<type>.<slug>`).
 *
 * Les cinq types historiques (`entretien`, `montage`, `hivernage`,
 * `dehivernage`, `atelier`) reprennent **à l'identique** les 56 items du
 * gabarit d'origine (mêmes libellés FR, même découpage, même ordre) ; seuls
 * `moteur_saison`, `carenage`, `catamaran` et `semi_rigide` sont nouveaux.
 *
 * Les fiches déjà instanciées ont leurs items copiés en base : elles gardent
 * leur texte tel quel, seuls les nouveaux gabarits produisent des libellés
 * traduits.
 */

function item(type: SheetType, slug: string): MaintenanceSheetTemplateItem {
  return {
    key: `${type}.${slug}`,
    labelKey: `maintenance.sheets.${type}.items.${slug}`,
  }
}

function template(type: SheetType, slugs: readonly string[]): MaintenanceSheetTemplate {
  return {
    type,
    labelKey: `maintenance.sheets.${type}.label`,
    items: slugs.map((slug) => item(type, slug)),
  }
}

export const MAINTENANCE_SHEET_TEMPLATES: Record<SheetType, MaintenanceSheetTemplate> = {
  entretien: template('entretien', [
    'hull_visual_inspection',
    'anodes_check',
    'rudder_check',
    'engine_inspection',
    'electrical_check',
    'nav_instruments_check',
    'deck_hardware_inspection',
    'safety_equipment_check',
    'standing_rigging_check',
    'general_cleaning',
  ]),
  montage: template('montage', [
    'mast_spreaders_check',
    'shrouds_stays_inspection',
    'standing_rigging_setup',
    'sails_installation',
    'running_rigging_tuning',
    'clutches_blocks_check',
    'winches_test',
    'masthead_instruments_check',
    'backstay_forestay_check',
    'short_sea_trial',
  ]),
  hivernage: template('hivernage', [
    'haul_out_cleaning',
    'antifouling_treatment',
    'anodes_check',
    'drain_engine',
    'cooling_antifreeze',
    'fuel_stabilizer',
    'batteries_storage',
    'sails_removal',
    'running_rigging_removal',
    'lines_blocks_protection',
    'seacocks_closing',
    'electronics_storage',
    'ventilation',
    'winter_cover',
  ]),
  dehivernage: template('dehivernage', [
    'hull_inspection',
    'seacocks_check',
    'rudder_steering_check',
    'batteries_recharge',
    'engine_service',
    'cooling_system_test',
    'electrical_check',
    'sails_installation',
    'standing_rigging_check',
    'running_rigging_check',
    'nav_instruments_test',
    'vhf_radio_test',
    'safety_gear_check',
    'sea_trial',
  ]),
  atelier: template('atelier', [
    'initial_diagnosis',
    'workstation_preparation',
    'parts_removal',
    'parts_repair',
    'tests_checks',
    'reassembly',
    'workstation_cleaning',
    'work_report',
  ]),
  // Mise en route / fin de saison moteur (#583) — décliné hors-bord / in-bord :
  // les items propres à une motorisation le précisent dans leur libellé.
  moteur_saison: template('moteur_saison', [
    'fluid_levels_check',
    'oil_filter_change',
    'impeller_check',
    'engine_anodes_check',
    'fuel_filter_change',
    'cooling_flush',
    'battery_check',
    'spark_plugs_check',
    'belts_check',
    'propeller_check',
    'controls_check',
    'engine_test_run',
  ]),
  carenage: template('carenage', [
    'haul_out',
    'pressure_wash',
    'underwater_hull_check',
    'anodes_replacement',
    'through_hulls_check',
    'propeller_shaft_check',
    'sanding_preparation',
    'antifouling_application',
    'hull_polishing',
    'relaunch',
  ]),
  catamaran: template('catamaran', [
    'port_engine_line_check',
    'starboard_engine_line_check',
    'hulls_inspection',
    'trampoline_check',
    'watertight_lockers_check',
    'steering_sync_check',
    'bimini_lazybag_check',
    'davits_tender_check',
  ]),
  semi_rigide: template('semi_rigide', [
    'tubes_pressure_check',
    'tubes_bonding_check',
    'valves_check',
    'freshwater_rinse',
    'engine_flush',
    'trailer_check',
    'tubes_protection',
    'winter_storage',
  ]),
}

/** Gabarits dans l'ordre d'affichage (celui de `SHEET_TYPES`). */
export const MAINTENANCE_SHEET_TEMPLATE_LIST: readonly MaintenanceSheetTemplate[] = SHEET_TYPES.map(
  (type) => MAINTENANCE_SHEET_TEMPLATES[type]
)

/**
 * Index des clés persistables (`template_key`) — même mécanique que
 * `ALL_INSPECTION_ITEM_KEYS` et `ALL_DIAGNOSTIC_STEP_KEYS`.
 */
export const ALL_MAINTENANCE_SHEET_ITEM_KEYS: ReadonlySet<string> = new Set(
  MAINTENANCE_SHEET_TEMPLATE_LIST.flatMap((sheet) => sheet.items.map((entry) => entry.key))
)
