import type {
  DiagnosticGlobalChecklist,
  DiagnosticSheet,
  DiagnosticSheetSlug,
  DiagnosticToolRow,
} from '#shared/types/diagnostic'

/**
 * Contenu statique des checklists de diagnostic panne hors-bord 2 temps
 * (issue #515). L'ordre des tableaux `steps` est l'ordre d'affichage — du
 * moins cher au plus cher — et n'est pas modifiable par l'utilisateur.
 *
 * Les `key` des étapes sont persistées en base (`boat_engine_diagnostic_checks.step_key`)
 * et ne doivent JAMAIS être renommées ; on peut en insérer de nouvelles à
 * n'importe quelle position.
 *
 * Correspondance avec les fiches numérotées de l'issue :
 *   fiche 1 → compression, fiche 2 → ignition, fiche 3 → fuel,
 *   fiche 4 → cooling, fiche 5 → gearcase, fiche 6 → electrical,
 *   fiche 7 → timing, fiche 8 → first-contact.
 */

export const GLOBAL_CHECKLIST: DiagnosticGlobalChecklist = {
  titleKey: 'diagnostic.global.title',
  introKey: 'diagnostic.global.intro',
  steps: [
    {
      key: 'global.flywheel',
      labelKey: 'diagnostic.global.steps.flywheel.label',
      detailKey: 'diagnostic.global.steps.flywheel.detail',
    },
    {
      key: 'global.gearshift',
      labelKey: 'diagnostic.global.steps.gearshift.label',
    },
    {
      key: 'global.kill_switch',
      labelKey: 'diagnostic.global.steps.kill_switch.label',
    },
    {
      key: 'global.fresh_fuel',
      labelKey: 'diagnostic.global.steps.fresh_fuel.label',
    },
    {
      key: 'global.tank_vent',
      labelKey: 'diagnostic.global.steps.tank_vent.label',
    },
    {
      key: 'global.compression',
      labelKey: 'diagnostic.global.steps.compression.label',
      linkedSheet: 'compression',
    },
    {
      key: 'global.spark',
      labelKey: 'diagnostic.global.steps.spark.label',
      linkedSheet: 'ignition',
    },
    {
      key: 'global.fuel_system',
      labelKey: 'diagnostic.global.steps.fuel_system.label',
      linkedSheet: 'fuel',
    },
    {
      key: 'global.tell_tale',
      labelKey: 'diagnostic.global.steps.tell_tale.label',
      linkedSheet: 'cooling',
    },
    {
      key: 'global.gear_oil',
      labelKey: 'diagnostic.global.steps.gear_oil.label',
      linkedSheet: 'gearcase',
    },
    {
      key: 'global.timing',
      labelKey: 'diagnostic.global.steps.timing.label',
      linkedSheet: 'timing',
    },
  ],
  warningKeys: ['diagnostic.global.warnings.waterOnly'],
}

const compressionSheet: DiagnosticSheet = {
  slug: 'compression',
  titleKey: 'diagnostic.sheets.compression.title',
  introKey: 'diagnostic.sheets.compression.intro',
  requiresRunningEngine: false,
  sections: [
    {
      steps: [
        {
          key: 'compression.all_cylinders',
          labelKey: 'diagnostic.sheets.compression.steps.all_cylinders.label',
        },
        {
          key: 'compression.spread_calculated',
          labelKey: 'diagnostic.sheets.compression.steps.spread_calculated.label',
          detailKey: 'diagnostic.sheets.compression.steps.spread_calculated.detail',
        },
        {
          key: 'compression.model_spec',
          labelKey: 'diagnostic.sheets.compression.steps.model_spec.label',
          detailKey: 'diagnostic.sheets.compression.steps.model_spec.detail',
        },
        {
          key: 'compression.retest_after_run',
          labelKey: 'diagnostic.sheets.compression.steps.retest_after_run.label',
        },
        {
          key: 'compression.retest_after_head',
          labelKey: 'diagnostic.sheets.compression.steps.retest_after_head.label',
        },
      ],
    },
  ],
  tables: [
    {
      id: 'criteria',
      headerKeys: [
        'diagnostic.sheets.compression.tables.criteria.headers.criterion',
        'diagnostic.sheets.compression.tables.criteria.headers.good',
        'diagnostic.sheets.compression.tables.criteria.headers.bad',
      ],
      rowKeys: [
        [
          'diagnostic.sheets.compression.tables.criteria.rows.spread.criterion',
          'diagnostic.sheets.compression.tables.criteria.rows.spread.good',
          'diagnostic.sheets.compression.tables.criteria.rows.spread.bad',
        ],
        [
          'diagnostic.sheets.compression.tables.criteria.rows.absolute.criterion',
          'diagnostic.sheets.compression.tables.criteria.rows.absolute.good',
          'diagnostic.sheets.compression.tables.criteria.rows.absolute.bad',
        ],
      ],
    },
  ],
  warningKeys: ['diagnostic.sheets.compression.warnings.gauges'],
  noteKeys: ['diagnostic.sheets.compression.notes.over_spread'],
}

const ignitionSheet: DiagnosticSheet = {
  slug: 'ignition',
  titleKey: 'diagnostic.sheets.ignition.title',
  introKey: 'diagnostic.sheets.ignition.intro',
  requiresRunningEngine: true,
  sections: [
    {
      steps: [
        {
          key: 'ignition.kill_circuit',
          labelKey: 'diagnostic.sheets.ignition.steps.kill_circuit.label',
          detailKey: 'diagnostic.sheets.ignition.steps.kill_circuit.detail',
        },
        {
          key: 'ignition.plugs',
          labelKey: 'diagnostic.sheets.ignition.steps.plugs.label',
        },
        {
          key: 'ignition.coils',
          labelKey: 'diagnostic.sheets.ignition.steps.coils.label',
          detailKey: 'diagnostic.sheets.ignition.steps.coils.detail',
        },
        {
          key: 'ignition.rectifier',
          labelKey: 'diagnostic.sheets.ignition.steps.rectifier.label',
        },
        {
          key: 'ignition.cranking_rpm',
          labelKey: 'diagnostic.sheets.ignition.steps.cranking_rpm.label',
        },
        {
          key: 'ignition.grounds',
          labelKey: 'diagnostic.sheets.ignition.steps.grounds.label',
        },
        {
          key: 'ignition.model_id',
          labelKey: 'diagnostic.sheets.ignition.steps.model_id.label',
        },
        {
          key: 'ignition.cdi_measures',
          labelKey: 'diagnostic.sheets.ignition.steps.cdi_measures.label',
          detailKey: 'diagnostic.sheets.ignition.steps.cdi_measures.detail',
        },
      ],
    },
  ],
  warningKeys: ['diagnostic.sheets.ignition.warnings.weak_spark'],
  noteKeys: [
    'diagnostic.sheets.ignition.notes.triage_all',
    'diagnostic.sheets.ignition.notes.triage_one',
    'diagnostic.sheets.ignition.notes.dva',
  ],
}

const fuelSheet: DiagnosticSheet = {
  slug: 'fuel',
  titleKey: 'diagnostic.sheets.fuel.title',
  introKey: 'diagnostic.sheets.fuel.intro',
  requiresRunningEngine: true,
  sections: [
    {
      titleKey: 'diagnostic.sheets.fuel.sections.tank.title',
      steps: [
        {
          key: 'fuel.fresh_fuel',
          labelKey: 'diagnostic.sheets.fuel.steps.fresh_fuel.label',
        },
        {
          key: 'fuel.tank_vent',
          labelKey: 'diagnostic.sheets.fuel.steps.tank_vent.label',
        },
        {
          key: 'fuel.black_hose_only',
          labelKey: 'diagnostic.sheets.fuel.steps.black_hose_only.label',
          detailKey: 'diagnostic.sheets.fuel.steps.black_hose_only.detail',
        },
        {
          key: 'fuel.primer_bulb',
          labelKey: 'diagnostic.sheets.fuel.steps.primer_bulb.label',
        },
        {
          key: 'fuel.air_leaks',
          labelKey: 'diagnostic.sheets.fuel.steps.air_leaks.label',
          detailKey: 'diagnostic.sheets.fuel.steps.air_leaks.detail',
        },
      ],
    },
    {
      titleKey: 'diagnostic.sheets.fuel.sections.filter_pump.title',
      steps: [
        {
          key: 'fuel.filter_direction',
          labelKey: 'diagnostic.sheets.fuel.steps.filter_direction.label',
        },
        {
          key: 'fuel.pump_test',
          labelKey: 'diagnostic.sheets.fuel.steps.pump_test.label',
          detailKey: 'diagnostic.sheets.fuel.steps.pump_test.detail',
        },
        {
          key: 'fuel.pump_replace',
          labelKey: 'diagnostic.sheets.fuel.steps.pump_replace.label',
        },
      ],
    },
    {
      titleKey: 'diagnostic.sheets.fuel.sections.carburetor.title',
      steps: [
        {
          key: 'fuel.carb_photos',
          labelKey: 'diagnostic.sheets.fuel.steps.carb_photos.label',
        },
        {
          key: 'fuel.carb_removal',
          labelKey: 'diagnostic.sheets.fuel.steps.carb_removal.label',
        },
        {
          key: 'fuel.carb_disassembly',
          labelKey: 'diagnostic.sheets.fuel.steps.carb_disassembly.label',
        },
        {
          key: 'fuel.mixture_screw_count',
          labelKey: 'diagnostic.sheets.fuel.steps.mixture_screw_count.label',
        },
        {
          key: 'fuel.carb_cleaner',
          labelKey: 'diagnostic.sheets.fuel.steps.carb_cleaner.label',
        },
        {
          key: 'fuel.cork_float',
          labelKey: 'diagnostic.sheets.fuel.steps.cork_float.label',
        },
        {
          key: 'fuel.float_level',
          labelKey: 'diagnostic.sheets.fuel.steps.float_level.label',
        },
        {
          key: 'fuel.blow_test',
          labelKey: 'diagnostic.sheets.fuel.steps.blow_test.label',
          detailKey: 'diagnostic.sheets.fuel.steps.blow_test.detail',
        },
        {
          key: 'fuel.reassembly',
          labelKey: 'diagnostic.sheets.fuel.steps.reassembly.label',
          detailKey: 'diagnostic.sheets.fuel.steps.reassembly.detail',
        },
      ],
    },
    {
      titleKey: 'diagnostic.sheets.fuel.sections.reed_valves.title',
      steps: [
        {
          key: 'fuel.reed_backfire',
          labelKey: 'diagnostic.sheets.fuel.steps.reed_backfire.label',
        },
        {
          key: 'fuel.reed_backlight',
          labelKey: 'diagnostic.sheets.fuel.steps.reed_backlight.label',
        },
      ],
    },
  ],
  tables: [
    {
      id: 'carb_symptoms',
      headerKeys: [
        'diagnostic.sheets.fuel.tables.carb_symptoms.headers.symptom',
        'diagnostic.sheets.fuel.tables.carb_symptoms.headers.cause',
      ],
      rowKeys: [
        [
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.choke_only.symptom',
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.choke_only.cause',
        ],
        [
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.leaking.symptom',
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.leaking.cause',
        ],
        [
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.flooding.symptom',
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.flooding.cause',
        ],
        [
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.dry_plugs.symptom',
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.dry_plugs.cause',
        ],
        [
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.sneezing.symptom',
          'diagnostic.sheets.fuel.tables.carb_symptoms.rows.sneezing.cause',
        ],
      ],
    },
  ],
  warningKeys: [],
}

const coolingSheet: DiagnosticSheet = {
  slug: 'cooling',
  titleKey: 'diagnostic.sheets.cooling.title',
  introKey: 'diagnostic.sheets.cooling.intro',
  requiresRunningEngine: true,
  sections: [
    {
      steps: [
        {
          key: 'cooling.telltale_nipple',
          labelKey: 'diagnostic.sheets.cooling.steps.telltale_nipple.label',
          detailKey: 'diagnostic.sheets.cooling.steps.telltale_nipple.detail',
        },
        {
          key: 'cooling.thermostat',
          labelKey: 'diagnostic.sheets.cooling.steps.thermostat.label',
          detailKey: 'diagnostic.sheets.cooling.steps.thermostat.detail',
        },
        {
          key: 'cooling.impeller',
          labelKey: 'diagnostic.sheets.cooling.steps.impeller.label',
          detailKey: 'diagnostic.sheets.cooling.steps.impeller.detail',
        },
        {
          key: 'cooling.drill_test',
          labelKey: 'diagnostic.sheets.cooling.steps.drill_test.label',
        },
        {
          key: 'cooling.water_tube',
          labelKey: 'diagnostic.sheets.cooling.steps.water_tube.label',
          detailKey: 'diagnostic.sheets.cooling.steps.water_tube.detail',
        },
        {
          key: 'cooling.water_jackets',
          labelKey: 'diagnostic.sheets.cooling.steps.water_jackets.label',
          detailKey: 'diagnostic.sheets.cooling.steps.water_jackets.detail',
        },
        {
          key: 'cooling.ir_thermometer',
          labelKey: 'diagnostic.sheets.cooling.steps.ir_thermometer.label',
        },
      ],
    },
  ],
  warningKeys: ['diagnostic.sheets.cooling.warnings.no_thermostat'],
  noteKeys: ['diagnostic.sheets.cooling.notes.used_engine'],
}

const gearcaseSheet: DiagnosticSheet = {
  slug: 'gearcase',
  titleKey: 'diagnostic.sheets.gearcase.title',
  requiresRunningEngine: false,
  sections: [
    {
      steps: [
        {
          key: 'gearcase.gear_oil',
          labelKey: 'diagnostic.sheets.gearcase.steps.gear_oil.label',
          detailKey: 'diagnostic.sheets.gearcase.steps.gear_oil.detail',
        },
        {
          key: 'gearcase.shear_pin',
          labelKey: 'diagnostic.sheets.gearcase.steps.shear_pin.label',
          detailKey: 'diagnostic.sheets.gearcase.steps.shear_pin.detail',
        },
        {
          key: 'gearcase.spun_hub',
          labelKey: 'diagnostic.sheets.gearcase.steps.spun_hub.label',
          detailKey: 'diagnostic.sheets.gearcase.steps.spun_hub.detail',
        },
        {
          key: 'gearcase.shift_linkage',
          labelKey: 'diagnostic.sheets.gearcase.steps.shift_linkage.label',
        },
        {
          key: 'gearcase.corroded_gearcase',
          labelKey: 'diagnostic.sheets.gearcase.steps.corroded_gearcase.label',
          detailKey: 'diagnostic.sheets.gearcase.steps.corroded_gearcase.detail',
        },
        {
          key: 'gearcase.grease_splines',
          labelKey: 'diagnostic.sheets.gearcase.steps.grease_splines.label',
        },
      ],
    },
  ],
  warningKeys: ['diagnostic.sheets.gearcase.warnings.cold_shift'],
}

const electricalSheet: DiagnosticSheet = {
  slug: 'electrical',
  titleKey: 'diagnostic.sheets.electrical.title',
  requiresRunningEngine: false,
  sections: [
    {
      steps: [
        {
          key: 'electrical.battery',
          labelKey: 'diagnostic.sheets.electrical.steps.battery.label',
        },
        {
          key: 'electrical.solenoid_jump',
          labelKey: 'diagnostic.sheets.electrical.steps.solenoid_jump.label',
          detailKey: 'diagnostic.sheets.electrical.steps.solenoid_jump.detail',
        },
        {
          key: 'electrical.solenoid_welded',
          labelKey: 'diagnostic.sheets.electrical.steps.solenoid_welded.label',
          detailKey: 'diagnostic.sheets.electrical.steps.solenoid_welded.detail',
        },
        {
          key: 'electrical.runaway_starter',
          labelKey: 'diagnostic.sheets.electrical.steps.runaway_starter.label',
          detailKey: 'diagnostic.sheets.electrical.steps.runaway_starter.detail',
        },
        {
          key: 'electrical.connections',
          labelKey: 'diagnostic.sheets.electrical.steps.connections.label',
          detailKey: 'diagnostic.sheets.electrical.steps.connections.detail',
        },
        {
          key: 'electrical.trim_wiring',
          labelKey: 'diagnostic.sheets.electrical.steps.trim_wiring.label',
          detailKey: 'diagnostic.sheets.electrical.steps.trim_wiring.detail',
        },
      ],
    },
  ],
  warningKeys: [],
}

const timingSheet: DiagnosticSheet = {
  slug: 'timing',
  titleKey: 'diagnostic.sheets.timing.title',
  introKey: 'diagnostic.sheets.timing.intro',
  requiresRunningEngine: true,
  sections: [
    {
      steps: [
        {
          key: 'timing.shop_manual',
          labelKey: 'diagnostic.sheets.timing.steps.shop_manual.label',
          detailKey: 'diagnostic.sheets.timing.steps.shop_manual.detail',
        },
        {
          key: 'timing.cam_roller',
          labelKey: 'diagnostic.sheets.timing.steps.cam_roller.label',
        },
        {
          key: 'timing.fast_start_modules',
          labelKey: 'diagnostic.sheets.timing.steps.fast_start_modules.label',
        },
        {
          key: 'timing.throttle_cable',
          labelKey: 'diagnostic.sheets.timing.steps.throttle_cable.label',
        },
        {
          key: 'timing.tdc_pointer',
          labelKey: 'diagnostic.sheets.timing.steps.tdc_pointer.label',
          detailKey: 'diagnostic.sheets.timing.steps.tdc_pointer.detail',
        },
        {
          key: 'timing.wot_stop',
          labelKey: 'diagnostic.sheets.timing.steps.wot_stop.label',
          detailKey: 'diagnostic.sheets.timing.steps.wot_stop.detail',
        },
        {
          key: 'timing.max_advance',
          labelKey: 'diagnostic.sheets.timing.steps.max_advance.label',
          detailKey: 'diagnostic.sheets.timing.steps.max_advance.detail',
        },
        {
          key: 'timing.pickup_timing',
          labelKey: 'diagnostic.sheets.timing.steps.pickup_timing.label',
          detailKey: 'diagnostic.sheets.timing.steps.pickup_timing.detail',
        },
        {
          key: 'timing.warm_mixture',
          labelKey: 'diagnostic.sheets.timing.steps.warm_mixture.label',
        },
        {
          key: 'timing.idle_rpm',
          labelKey: 'diagnostic.sheets.timing.steps.idle_rpm.label',
        },
        {
          key: 'timing.cable_preload',
          labelKey: 'diagnostic.sheets.timing.steps.cable_preload.label',
        },
        {
          key: 'timing.sea_trial',
          labelKey: 'diagnostic.sheets.timing.steps.sea_trial.label',
        },
      ],
    },
  ],
  tables: [
    {
      id: 'symptoms',
      headerKeys: [
        'diagnostic.sheets.timing.tables.symptoms.headers.symptom',
        'diagnostic.sheets.timing.tables.symptoms.headers.lead',
      ],
      rowKeys: [
        [
          'diagnostic.sheets.timing.tables.symptoms.rows.no_start.symptom',
          'diagnostic.sheets.timing.tables.symptoms.rows.no_start.lead',
        ],
        [
          'diagnostic.sheets.timing.tables.symptoms.rows.high_idle.symptom',
          'diagnostic.sheets.timing.tables.symptoms.rows.high_idle.lead',
        ],
        [
          'diagnostic.sheets.timing.tables.symptoms.rows.acceleration_gap.symptom',
          'diagnostic.sheets.timing.tables.symptoms.rows.acceleration_gap.lead',
        ],
        [
          'diagnostic.sheets.timing.tables.symptoms.rows.detonation.symptom',
          'diagnostic.sheets.timing.tables.symptoms.rows.detonation.lead',
        ],
      ],
    },
  ],
  warningKeys: ['diagnostic.sheets.timing.warnings.max_advance'],
  noteKeys: ['diagnostic.sheets.timing.notes.single_carb'],
}

const firstContactSheet: DiagnosticSheet = {
  slug: 'first-contact',
  titleKey: 'diagnostic.sheets.first_contact.title',
  introKey: 'diagnostic.sheets.first_contact.intro',
  requiresRunningEngine: true,
  standalone: true,
  sections: [
    {
      steps: [
        {
          key: 'first-contact.flywheel',
          labelKey: 'diagnostic.sheets.first_contact.steps.flywheel.label',
        },
        {
          key: 'first-contact.gearshift',
          labelKey: 'diagnostic.sheets.first_contact.steps.gearshift.label',
        },
        {
          key: 'first-contact.compression',
          labelKey: 'diagnostic.sheets.first_contact.steps.compression.label',
          detailKey: 'diagnostic.sheets.first_contact.steps.compression.detail',
        },
        {
          key: 'first-contact.spark',
          labelKey: 'diagnostic.sheets.first_contact.steps.spark.label',
        },
        {
          key: 'first-contact.gear_oil',
          labelKey: 'diagnostic.sheets.first_contact.steps.gear_oil.label',
        },
        {
          key: 'first-contact.external_tank',
          labelKey: 'diagnostic.sheets.first_contact.steps.external_tank.label',
        },
        {
          key: 'first-contact.primer_bulb',
          labelKey: 'diagnostic.sheets.first_contact.steps.primer_bulb.label',
        },
        {
          key: 'first-contact.start_listen',
          labelKey: 'diagnostic.sheets.first_contact.steps.start_listen.label',
        },
      ],
    },
  ],
  warningKeys: [],
  noteKeys: ['diagnostic.sheets.first_contact.notes.deal_breakers'],
}

export const DIAGNOSTIC_SHEETS: Record<DiagnosticSheetSlug, DiagnosticSheet> = {
  'compression': compressionSheet,
  'ignition': ignitionSheet,
  'fuel': fuelSheet,
  'cooling': coolingSheet,
  'gearcase': gearcaseSheet,
  'electrical': electricalSheet,
  'timing': timingSheet,
  'first-contact': firstContactSheet,
}

export const DIAGNOSTIC_TOOLS: readonly DiagnosticToolRow[] = [
  'compression_gauge',
  'spark_tester',
  'gap_tool',
  'multimeter',
  'flywheel_puller',
  'carb_cleaner',
  'ir_thermometer',
  'torque_wrench',
  'timing_light',
  'dva_adapter',
  'water_tub',
  'cdi_guide',
].map((id) => ({
  id,
  nameKey: `diagnostic.tooling.items.${id}.name`,
  usageKey: `diagnostic.tooling.items.${id}.usage`,
  priceKey: `diagnostic.tooling.items.${id}.price`,
}))

/**
 * Clés persistables en base : checklist globale + fiches liées à un moteur.
 * La fiche « first-contact » (achat d'occasion) est exclue : son état est
 * local au navigateur, le moteur prospect n'existant pas en base.
 */
export const ALL_DIAGNOSTIC_STEP_KEYS: ReadonlySet<string> = new Set(
  [
    ...GLOBAL_CHECKLIST.steps,
    ...Object.values(DIAGNOSTIC_SHEETS)
      .filter((sheet) => !sheet.standalone)
      .flatMap((sheet) => sheet.sections.flatMap((section) => [...section.steps])),
  ].map((step) => step.key)
)
