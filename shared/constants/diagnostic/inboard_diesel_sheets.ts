import type {
  DiagnosticGlobalChecklist,
  DiagnosticSheet,
  DiagnosticSheetSlug,
} from '#shared/types/diagnostic'
import type { EngineFamily } from '#shared/types/engine_catalog'

/**
 * Checklists de panne des motorisations **in-bord** (#576) — la moitié du
 * corpus que les 8 fiches hors-bord 2 temps de #515 ne pouvaient pas décrire :
 * ni mélange 50:1 ni power pack sur un diesel, mais une crépine d'eau de mer,
 * un préfiltre décanteur, un coude d'échappement et un soufflet de saildrive.
 *
 * Mêmes règles que le corpus hors-bord :
 * - les `key` (`<fiche>.<slug>`) sont **persistées** dans
 *   `boat_engine_diagnostic_checks.step_key` : on en insère, on n'en renomme
 *   jamais ;
 * - l'ordre des `steps` est l'ordre d'affichage, du moins cher au plus cher ;
 * - le contenu oriente, il ne remplace ni le manuel d'atelier ni un
 *   professionnel.
 *
 * `families` déclare à quelles familles de motorisation la fiche s'applique :
 * c'est ce qui rend un in-bord diesel éligible au diagnostic sans ouvrir les
 * fiches 2 temps à un moteur qui n'a ni clapets ni link & sync.
 */

/** Toutes les motorisations servies par ce corpus. */
const INBOARD_FAMILIES: readonly EngineFamily[] = [
  'inboard_diesel_shaft',
  'inboard_diesel_saildrive',
  'sterndrive',
  'generator',
]

/** Motorisations proprement diesel — gasoil, préchauffage, fumées. */
const DIESEL_FAMILIES: readonly EngineFamily[] = [
  'inboard_diesel_shaft',
  'inboard_diesel_saildrive',
  'generator',
]

/**
 * Checklist globale in-bord. Son préfixe de clés (`global-inboard.`) est
 * distinct de celui du hors-bord (`global.`) : les deux checklists cohabitent
 * en base sans qu'une case cochée sur l'une compte pour l'autre.
 *
 * Ordre : ce qui se contrôle à quai, à la main, sans rien démonter, avant ce
 * qui demande un outil.
 */
export const INBOARD_GLOBAL_CHECKLIST: DiagnosticGlobalChecklist = {
  scope: 'global-inboard',
  families: INBOARD_FAMILIES,
  titleKey: 'diagnostic.globalInboard.title',
  introKey: 'diagnostic.globalInboard.intro',
  steps: [
    {
      key: 'global-inboard.battery_switch',
      labelKey: 'diagnostic.globalInboard.steps.battery_switch.label',
      detailKey: 'diagnostic.globalInboard.steps.battery_switch.detail',
      linkedSheet: 'electrical',
    },
    {
      key: 'global-inboard.sea_cock',
      labelKey: 'diagnostic.globalInboard.steps.sea_cock.label',
      detailKey: 'diagnostic.globalInboard.steps.sea_cock.detail',
      linkedSheet: 'inboard-cooling',
    },
    {
      key: 'global-inboard.strainer',
      labelKey: 'diagnostic.globalInboard.steps.strainer.label',
      linkedSheet: 'inboard-cooling',
    },
    {
      key: 'global-inboard.raw_water_flow',
      labelKey: 'diagnostic.globalInboard.steps.raw_water_flow.label',
      detailKey: 'diagnostic.globalInboard.steps.raw_water_flow.detail',
      linkedSheet: 'inboard-cooling',
    },
    {
      key: 'global-inboard.coolant_level',
      labelKey: 'diagnostic.globalInboard.steps.coolant_level.label',
      detailKey: 'diagnostic.globalInboard.steps.coolant_level.detail',
      linkedSheet: 'inboard-cooling',
    },
    {
      key: 'global-inboard.belt',
      labelKey: 'diagnostic.globalInboard.steps.belt.label',
      detailKey: 'diagnostic.globalInboard.steps.belt.detail',
    },
    {
      key: 'global-inboard.oil_level',
      labelKey: 'diagnostic.globalInboard.steps.oil_level.label',
      detailKey: 'diagnostic.globalInboard.steps.oil_level.detail',
    },
    {
      key: 'global-inboard.fuel_supply',
      labelKey: 'diagnostic.globalInboard.steps.fuel_supply.label',
      linkedSheet: 'diesel-fuel',
    },
    {
      key: 'global-inboard.prefilter_bowl',
      labelKey: 'diagnostic.globalInboard.steps.prefilter_bowl.label',
      detailKey: 'diagnostic.globalInboard.steps.prefilter_bowl.detail',
      linkedSheet: 'diesel-fuel',
    },
    {
      key: 'global-inboard.exhaust_smoke',
      labelKey: 'diagnostic.globalInboard.steps.exhaust_smoke.label',
      linkedSheet: 'diesel-smoke',
    },
    {
      key: 'global-inboard.gearbox_oil',
      labelKey: 'diagnostic.globalInboard.steps.gearbox_oil.label',
      linkedSheet: 'gearbox',
    },
    {
      key: 'global-inboard.bilge_dry',
      labelKey: 'diagnostic.globalInboard.steps.bilge_dry.label',
      detailKey: 'diagnostic.globalInboard.steps.bilge_dry.detail',
      linkedSheet: 'shaft-line',
    },
  ],
  warningKeys: [
    'diagnostic.globalInboard.warnings.hotPressurisedCircuit',
    'diagnostic.globalInboard.warnings.engineOffBeforeBelt',
  ],
  warningTitleKey: 'diagnostic.common.safetyTitle',
}

const inboardCoolingSheet: DiagnosticSheet = {
  slug: 'inboard-cooling',
  titleKey: 'diagnostic.sheets.inboard_cooling.title',
  introKey: 'diagnostic.sheets.inboard_cooling.intro',
  families: INBOARD_FAMILIES,
  requiresRunningEngine: true,
  runningEngineWarning: {
    titleKey: 'diagnostic.common.seaCockTitle',
    textKey: 'diagnostic.common.seaCock',
  },
  sections: [
    {
      titleKey: 'diagnostic.sheets.inboard_cooling.sections.raw_water',
      steps: [
        {
          key: 'inboard-cooling.sea_cock',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.sea_cock.label',
        },
        {
          key: 'inboard-cooling.strainer',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.strainer.label',
          detailKey: 'diagnostic.sheets.inboard_cooling.steps.strainer.detail',
        },
        {
          key: 'inboard-cooling.hose_collapse',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.hose_collapse.label',
          detailKey: 'diagnostic.sheets.inboard_cooling.steps.hose_collapse.detail',
        },
        {
          key: 'inboard-cooling.impeller',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.impeller.label',
          detailKey: 'diagnostic.sheets.inboard_cooling.steps.impeller.detail',
        },
        {
          key: 'inboard-cooling.impeller_debris',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.impeller_debris.label',
          detailKey: 'diagnostic.sheets.inboard_cooling.steps.impeller_debris.detail',
        },
        {
          key: 'inboard-cooling.pump_cover',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.pump_cover.label',
        },
      ],
    },
    {
      titleKey: 'diagnostic.sheets.inboard_cooling.sections.fresh_water',
      steps: [
        {
          key: 'inboard-cooling.coolant_level',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.coolant_level.label',
          detailKey: 'diagnostic.sheets.inboard_cooling.steps.coolant_level.detail',
        },
        {
          key: 'inboard-cooling.belt',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.belt.label',
          detailKey: 'diagnostic.sheets.inboard_cooling.steps.belt.detail',
        },
        {
          key: 'inboard-cooling.thermostat',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.thermostat.label',
          detailKey: 'diagnostic.sheets.inboard_cooling.steps.thermostat.detail',
        },
        {
          key: 'inboard-cooling.heat_exchanger',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.heat_exchanger.label',
          detailKey: 'diagnostic.sheets.inboard_cooling.steps.heat_exchanger.detail',
        },
        {
          key: 'inboard-cooling.anodes',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.anodes.label',
          detailKey: 'diagnostic.sheets.inboard_cooling.steps.anodes.detail',
        },
        {
          key: 'inboard-cooling.exhaust_elbow',
          labelKey: 'diagnostic.sheets.inboard_cooling.steps.exhaust_elbow.label',
          linkedSheet: 'wet-exhaust',
        },
      ],
    },
  ],
  tables: [
    {
      id: 'symptoms',
      headerKeys: [
        'diagnostic.sheets.inboard_cooling.tables.symptoms.headers.symptom',
        'diagnostic.sheets.inboard_cooling.tables.symptoms.headers.reading',
        'diagnostic.sheets.inboard_cooling.tables.symptoms.headers.check',
      ],
      rowKeys: [
        [
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.no_water.symptom',
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.no_water.reading',
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.no_water.check',
        ],
        [
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.water_no_alarm.symptom',
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.water_no_alarm.reading',
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.water_no_alarm.check',
        ],
        [
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.steam.symptom',
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.steam.reading',
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.steam.check',
        ],
        [
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.slow_rise.symptom',
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.slow_rise.reading',
          'diagnostic.sheets.inboard_cooling.tables.symptoms.rows.slow_rise.check',
        ],
      ],
    },
  ],
  warningKeys: [
    'diagnostic.sheets.inboard_cooling.warnings.hotPressurisedCircuit',
    'diagnostic.sheets.inboard_cooling.warnings.engineOffBeforeBelt',
    'diagnostic.sheets.inboard_cooling.warnings.neverRunDry',
  ],
  noteKeys: ['diagnostic.sheets.inboard_cooling.notes.impeller_interval'],
}

const dieselFuelSheet: DiagnosticSheet = {
  slug: 'diesel-fuel',
  titleKey: 'diagnostic.sheets.diesel_fuel.title',
  introKey: 'diagnostic.sheets.diesel_fuel.intro',
  families: DIESEL_FAMILIES,
  requiresRunningEngine: true,
  runningEngineWarning: {
    titleKey: 'diagnostic.common.seaCockTitle',
    textKey: 'diagnostic.common.seaCock',
  },
  sections: [
    {
      steps: [
        {
          key: 'diesel-fuel.tank_valve',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.tank_valve.label',
        },
        {
          key: 'diesel-fuel.prefilter_bowl',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.prefilter_bowl.label',
          detailKey: 'diagnostic.sheets.diesel_fuel.steps.prefilter_bowl.detail',
        },
        {
          key: 'diesel-fuel.prefilter_element',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.prefilter_element.label',
          detailKey: 'diagnostic.sheets.diesel_fuel.steps.prefilter_element.detail',
        },
        {
          key: 'diesel-fuel.engine_filter',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.engine_filter.label',
        },
        {
          key: 'diesel-fuel.bleed',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.bleed.label',
          detailKey: 'diagnostic.sheets.diesel_fuel.steps.bleed.detail',
        },
        {
          key: 'diesel-fuel.air_leak',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.air_leak.label',
          detailKey: 'diagnostic.sheets.diesel_fuel.steps.air_leak.detail',
        },
        {
          key: 'diesel-fuel.lift_pump',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.lift_pump.label',
          detailKey: 'diagnostic.sheets.diesel_fuel.steps.lift_pump.detail',
        },
        {
          key: 'diesel-fuel.stop_solenoid',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.stop_solenoid.label',
          detailKey: 'diagnostic.sheets.diesel_fuel.steps.stop_solenoid.detail',
        },
        {
          key: 'diesel-fuel.injector_return',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.injector_return.label',
          detailKey: 'diagnostic.sheets.diesel_fuel.steps.injector_return.detail',
        },
        {
          key: 'diesel-fuel.tank_bottom',
          labelKey: 'diagnostic.sheets.diesel_fuel.steps.tank_bottom.label',
          detailKey: 'diagnostic.sheets.diesel_fuel.steps.tank_bottom.detail',
        },
      ],
    },
  ],
  tables: [
    {
      id: 'symptoms',
      headerKeys: [
        'diagnostic.sheets.diesel_fuel.tables.symptoms.headers.symptom',
        'diagnostic.sheets.diesel_fuel.tables.symptoms.headers.reading',
        'diagnostic.sheets.diesel_fuel.tables.symptoms.headers.check',
      ],
      rowKeys: [
        [
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.starts_then_stalls.symptom',
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.starts_then_stalls.reading',
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.starts_then_stalls.check',
        ],
        [
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.power_loss_swell.symptom',
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.power_loss_swell.reading',
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.power_loss_swell.check',
        ],
        [
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.no_start_after_filter.symptom',
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.no_start_after_filter.reading',
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.no_start_after_filter.check',
        ],
        [
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.hunting.symptom',
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.hunting.reading',
          'diagnostic.sheets.diesel_fuel.tables.symptoms.rows.hunting.check',
        ],
      ],
    },
  ],
  warningKeys: [
    'diagnostic.sheets.diesel_fuel.warnings.highPressureInjection',
    'diagnostic.sheets.diesel_fuel.warnings.fuelAndHotParts',
  ],
  noteKeys: ['diagnostic.sheets.diesel_fuel.notes.diesel_bug'],
}

const dieselSmokeSheet: DiagnosticSheet = {
  slug: 'diesel-smoke',
  titleKey: 'diagnostic.sheets.diesel_smoke.title',
  introKey: 'diagnostic.sheets.diesel_smoke.intro',
  families: DIESEL_FAMILIES,
  requiresRunningEngine: true,
  runningEngineWarning: {
    titleKey: 'diagnostic.common.seaCockTitle',
    textKey: 'diagnostic.common.seaCock',
  },
  sections: [
    {
      steps: [
        {
          key: 'diesel-smoke.color_identified',
          labelKey: 'diagnostic.sheets.diesel_smoke.steps.color_identified.label',
          detailKey: 'diagnostic.sheets.diesel_smoke.steps.color_identified.detail',
        },
        {
          key: 'diesel-smoke.air_filter',
          labelKey: 'diagnostic.sheets.diesel_smoke.steps.air_filter.label',
          detailKey: 'diagnostic.sheets.diesel_smoke.steps.air_filter.detail',
        },
        {
          key: 'diesel-smoke.overload',
          labelKey: 'diagnostic.sheets.diesel_smoke.steps.overload.label',
          detailKey: 'diagnostic.sheets.diesel_smoke.steps.overload.detail',
        },
        {
          key: 'diesel-smoke.back_pressure',
          labelKey: 'diagnostic.sheets.diesel_smoke.steps.back_pressure.label',
          linkedSheet: 'wet-exhaust',
        },
        {
          key: 'diesel-smoke.coolant_loss',
          labelKey: 'diagnostic.sheets.diesel_smoke.steps.coolant_loss.label',
          detailKey: 'diagnostic.sheets.diesel_smoke.steps.coolant_loss.detail',
          linkedSheet: 'inboard-cooling',
        },
        {
          key: 'diesel-smoke.oil_level_rising',
          labelKey: 'diagnostic.sheets.diesel_smoke.steps.oil_level_rising.label',
          detailKey: 'diagnostic.sheets.diesel_smoke.steps.oil_level_rising.detail',
        },
        {
          key: 'diesel-smoke.cold_start_only',
          labelKey: 'diagnostic.sheets.diesel_smoke.steps.cold_start_only.label',
          detailKey: 'diagnostic.sheets.diesel_smoke.steps.cold_start_only.detail',
        },
      ],
    },
  ],
  tables: [
    {
      id: 'colors',
      headerKeys: [
        'diagnostic.sheets.diesel_smoke.tables.colors.headers.color',
        'diagnostic.sheets.diesel_smoke.tables.colors.headers.reading',
        'diagnostic.sheets.diesel_smoke.tables.colors.headers.check',
      ],
      rowKeys: [
        [
          'diagnostic.sheets.diesel_smoke.tables.colors.rows.black.color',
          'diagnostic.sheets.diesel_smoke.tables.colors.rows.black.reading',
          'diagnostic.sheets.diesel_smoke.tables.colors.rows.black.check',
        ],
        [
          'diagnostic.sheets.diesel_smoke.tables.colors.rows.white.color',
          'diagnostic.sheets.diesel_smoke.tables.colors.rows.white.reading',
          'diagnostic.sheets.diesel_smoke.tables.colors.rows.white.check',
        ],
        [
          'diagnostic.sheets.diesel_smoke.tables.colors.rows.blue.color',
          'diagnostic.sheets.diesel_smoke.tables.colors.rows.blue.reading',
          'diagnostic.sheets.diesel_smoke.tables.colors.rows.blue.check',
        ],
      ],
    },
  ],
  warningKeys: ['diagnostic.sheets.diesel_smoke.warnings.whiteSmokeMeansWater'],
  noteKeys: ['diagnostic.sheets.diesel_smoke.notes.cold_start_haze'],
}

const wetExhaustSheet: DiagnosticSheet = {
  slug: 'wet-exhaust',
  titleKey: 'diagnostic.sheets.wet_exhaust.title',
  introKey: 'diagnostic.sheets.wet_exhaust.intro',
  families: INBOARD_FAMILIES,
  requiresRunningEngine: false,
  sections: [
    {
      steps: [
        {
          key: 'wet-exhaust.elbow_corrosion',
          labelKey: 'diagnostic.sheets.wet_exhaust.steps.elbow_corrosion.label',
          detailKey: 'diagnostic.sheets.wet_exhaust.steps.elbow_corrosion.detail',
        },
        {
          key: 'wet-exhaust.elbow_injection',
          labelKey: 'diagnostic.sheets.wet_exhaust.steps.elbow_injection.label',
          detailKey: 'diagnostic.sheets.wet_exhaust.steps.elbow_injection.detail',
        },
        {
          key: 'wet-exhaust.waterlock_full',
          labelKey: 'diagnostic.sheets.wet_exhaust.steps.waterlock_full.label',
          detailKey: 'diagnostic.sheets.wet_exhaust.steps.waterlock_full.detail',
        },
        {
          key: 'wet-exhaust.hose_sag',
          labelKey: 'diagnostic.sheets.wet_exhaust.steps.hose_sag.label',
          detailKey: 'diagnostic.sheets.wet_exhaust.steps.hose_sag.detail',
        },
        {
          key: 'wet-exhaust.swan_neck',
          labelKey: 'diagnostic.sheets.wet_exhaust.steps.swan_neck.label',
          detailKey: 'diagnostic.sheets.wet_exhaust.steps.swan_neck.detail',
        },
        {
          key: 'wet-exhaust.siphon_break',
          labelKey: 'diagnostic.sheets.wet_exhaust.steps.siphon_break.label',
          detailKey: 'diagnostic.sheets.wet_exhaust.steps.siphon_break.detail',
        },
        {
          key: 'wet-exhaust.clamps',
          labelKey: 'diagnostic.sheets.wet_exhaust.steps.clamps.label',
        },
      ],
    },
  ],
  warningKeys: [
    'diagnostic.sheets.wet_exhaust.warnings.waterInCylinders',
    'diagnostic.sheets.wet_exhaust.warnings.carbonMonoxide',
  ],
  noteKeys: ['diagnostic.sheets.wet_exhaust.notes.elbow_interval'],
}

const gearboxSheet: DiagnosticSheet = {
  slug: 'gearbox',
  titleKey: 'diagnostic.sheets.gearbox.title',
  introKey: 'diagnostic.sheets.gearbox.intro',
  families: ['inboard_diesel_shaft', 'inboard_diesel_saildrive', 'sterndrive'],
  requiresRunningEngine: true,
  runningEngineWarning: {
    titleKey: 'diagnostic.common.seaCockTitle',
    textKey: 'diagnostic.common.seaCock',
  },
  sections: [
    {
      steps: [
        {
          key: 'gearbox.oil_level',
          labelKey: 'diagnostic.sheets.gearbox.steps.oil_level.label',
          detailKey: 'diagnostic.sheets.gearbox.steps.oil_level.detail',
        },
        {
          key: 'gearbox.oil_color',
          labelKey: 'diagnostic.sheets.gearbox.steps.oil_color.label',
          detailKey: 'diagnostic.sheets.gearbox.steps.oil_color.detail',
        },
        {
          key: 'gearbox.control_cable',
          labelKey: 'diagnostic.sheets.gearbox.steps.control_cable.label',
          detailKey: 'diagnostic.sheets.gearbox.steps.control_cable.detail',
        },
        {
          key: 'gearbox.lever_travel',
          labelKey: 'diagnostic.sheets.gearbox.steps.lever_travel.label',
          detailKey: 'diagnostic.sheets.gearbox.steps.lever_travel.detail',
        },
        {
          key: 'gearbox.damper_plate',
          labelKey: 'diagnostic.sheets.gearbox.steps.damper_plate.label',
          detailKey: 'diagnostic.sheets.gearbox.steps.damper_plate.detail',
        },
        {
          key: 'gearbox.output_seal',
          labelKey: 'diagnostic.sheets.gearbox.steps.output_seal.label',
          detailKey: 'diagnostic.sheets.gearbox.steps.output_seal.detail',
        },
        {
          key: 'gearbox.oil_cooler',
          labelKey: 'diagnostic.sheets.gearbox.steps.oil_cooler.label',
          detailKey: 'diagnostic.sheets.gearbox.steps.oil_cooler.detail',
          linkedSheet: 'inboard-cooling',
        },
      ],
    },
  ],
  warningKeys: ['diagnostic.sheets.gearbox.warnings.noEngagementUnderLoad'],
  noteKeys: ['diagnostic.sheets.gearbox.notes.oil_spec'],
}

const shaftLineSheet: DiagnosticSheet = {
  slug: 'shaft-line',
  titleKey: 'diagnostic.sheets.shaft_line.title',
  introKey: 'diagnostic.sheets.shaft_line.intro',
  families: ['inboard_diesel_shaft'],
  requiresRunningEngine: false,
  sections: [
    {
      steps: [
        {
          key: 'shaft-line.packing_drip',
          labelKey: 'diagnostic.sheets.shaft_line.steps.packing_drip.label',
          detailKey: 'diagnostic.sheets.shaft_line.steps.packing_drip.detail',
        },
        {
          key: 'shaft-line.packing_tightening',
          labelKey: 'diagnostic.sheets.shaft_line.steps.packing_tightening.label',
          detailKey: 'diagnostic.sheets.shaft_line.steps.packing_tightening.detail',
        },
        {
          key: 'shaft-line.packing_age',
          labelKey: 'diagnostic.sheets.shaft_line.steps.packing_age.label',
          detailKey: 'diagnostic.sheets.shaft_line.steps.packing_age.detail',
        },
        {
          key: 'shaft-line.cutless_bearing',
          labelKey: 'diagnostic.sheets.shaft_line.steps.cutless_bearing.label',
          detailKey: 'diagnostic.sheets.shaft_line.steps.cutless_bearing.detail',
        },
        {
          key: 'shaft-line.shaft_play',
          labelKey: 'diagnostic.sheets.shaft_line.steps.shaft_play.label',
        },
        {
          key: 'shaft-line.alignment',
          labelKey: 'diagnostic.sheets.shaft_line.steps.alignment.label',
          detailKey: 'diagnostic.sheets.shaft_line.steps.alignment.detail',
        },
        {
          key: 'shaft-line.coupling_bolts',
          labelKey: 'diagnostic.sheets.shaft_line.steps.coupling_bolts.label',
        },
        {
          key: 'shaft-line.propeller_fouling',
          labelKey: 'diagnostic.sheets.shaft_line.steps.propeller_fouling.label',
          detailKey: 'diagnostic.sheets.shaft_line.steps.propeller_fouling.detail',
        },
      ],
    },
  ],
  warningKeys: [
    'diagnostic.sheets.shaft_line.warnings.floodingRisk',
    'diagnostic.sheets.shaft_line.warnings.engineOffBeforeShaft',
  ],
  noteKeys: ['diagnostic.sheets.shaft_line.notes.dripless_variants'],
}

const saildriveSheet: DiagnosticSheet = {
  slug: 'saildrive',
  titleKey: 'diagnostic.sheets.saildrive.title',
  introKey: 'diagnostic.sheets.saildrive.intro',
  families: ['inboard_diesel_saildrive'],
  requiresRunningEngine: false,
  sections: [
    {
      steps: [
        {
          key: 'saildrive.diaphragm_date',
          labelKey: 'diagnostic.sheets.saildrive.steps.diaphragm_date.label',
          detailKey: 'diagnostic.sheets.saildrive.steps.diaphragm_date.detail',
        },
        {
          key: 'saildrive.diaphragm_condition',
          labelKey: 'diagnostic.sheets.saildrive.steps.diaphragm_condition.label',
          detailKey: 'diagnostic.sheets.saildrive.steps.diaphragm_condition.detail',
        },
        {
          key: 'saildrive.water_alarm',
          labelKey: 'diagnostic.sheets.saildrive.steps.water_alarm.label',
          detailKey: 'diagnostic.sheets.saildrive.steps.water_alarm.detail',
        },
        {
          key: 'saildrive.oil_level',
          labelKey: 'diagnostic.sheets.saildrive.steps.oil_level.label',
        },
        {
          key: 'saildrive.oil_emulsion',
          labelKey: 'diagnostic.sheets.saildrive.steps.oil_emulsion.label',
          detailKey: 'diagnostic.sheets.saildrive.steps.oil_emulsion.detail',
        },
        {
          key: 'saildrive.anodes',
          labelKey: 'diagnostic.sheets.saildrive.steps.anodes.label',
          detailKey: 'diagnostic.sheets.saildrive.steps.anodes.detail',
        },
        {
          key: 'saildrive.paint_compatibility',
          labelKey: 'diagnostic.sheets.saildrive.steps.paint_compatibility.label',
          detailKey: 'diagnostic.sheets.saildrive.steps.paint_compatibility.detail',
        },
        {
          key: 'saildrive.gaiter_clamps',
          labelKey: 'diagnostic.sheets.saildrive.steps.gaiter_clamps.label',
        },
      ],
    },
  ],
  warningKeys: [
    'diagnostic.sheets.saildrive.warnings.diaphragmExpiry',
    'diagnostic.sheets.saildrive.warnings.floodingRisk',
  ],
  noteKeys: ['diagnostic.sheets.saildrive.notes.haul_out_required'],
}

/** Fiches in-bord, dans l'ordre d'affichage. */
export const INBOARD_DIESEL_SHEETS: Record<
  Extract<
    DiagnosticSheetSlug,
    | 'inboard-cooling'
    | 'diesel-fuel'
    | 'diesel-smoke'
    | 'wet-exhaust'
    | 'gearbox'
    | 'shaft-line'
    | 'saildrive'
  >,
  DiagnosticSheet
> = {
  'inboard-cooling': inboardCoolingSheet,
  'diesel-fuel': dieselFuelSheet,
  'diesel-smoke': dieselSmokeSheet,
  'wet-exhaust': wetExhaustSheet,
  'gearbox': gearboxSheet,
  'shaft-line': shaftLineSheet,
  'saildrive': saildriveSheet,
}

/**
 * Section « démarrage et charge » ajoutée à la fiche `electrical` du corpus
 * hors-bord (#576) : la fiche est **élargie** aux in-bord plutôt que dupliquée,
 * mais un hors-bord n'a ni courroie d'alternateur ni bougies de préchauffage —
 * d'où le filtrage par famille au niveau de la section.
 */
export const INBOARD_ELECTRICAL_FAMILIES = INBOARD_FAMILIES

export const INBOARD_ELECTRICAL_SECTION = {
  titleKey: 'diagnostic.sheets.electrical.sections.inboard_charging',
  families: INBOARD_FAMILIES,
  steps: [
    {
      key: 'electrical.battery_switch',
      labelKey: 'diagnostic.sheets.electrical.steps.battery_switch.label',
      detailKey: 'diagnostic.sheets.electrical.steps.battery_switch.detail',
    },
    {
      key: 'electrical.start_battery_load',
      labelKey: 'diagnostic.sheets.electrical.steps.start_battery_load.label',
      detailKey: 'diagnostic.sheets.electrical.steps.start_battery_load.detail',
    },
    {
      key: 'electrical.glow_plugs',
      labelKey: 'diagnostic.sheets.electrical.steps.glow_plugs.label',
      detailKey: 'diagnostic.sheets.electrical.steps.glow_plugs.detail',
    },
    {
      key: 'electrical.start_relay',
      labelKey: 'diagnostic.sheets.electrical.steps.start_relay.label',
      detailKey: 'diagnostic.sheets.electrical.steps.start_relay.detail',
    },
    {
      key: 'electrical.alternator_belt',
      labelKey: 'diagnostic.sheets.electrical.steps.alternator_belt.label',
      detailKey: 'diagnostic.sheets.electrical.steps.alternator_belt.detail',
    },
    {
      key: 'electrical.alternator_output',
      labelKey: 'diagnostic.sheets.electrical.steps.alternator_output.label',
      detailKey: 'diagnostic.sheets.electrical.steps.alternator_output.detail',
    },
    {
      key: 'electrical.panel_alarm',
      labelKey: 'diagnostic.sheets.electrical.steps.panel_alarm.label',
      detailKey: 'diagnostic.sheets.electrical.steps.panel_alarm.detail',
    },
  ],
} as const
