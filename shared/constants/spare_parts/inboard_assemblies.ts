import { ENGINE_FAMILIES, type EngineFamily } from '#shared/types/engine_catalog'
import type { SparePartAssembly } from '#shared/types/spare_parts'

/**
 * Ensembles fonctionnels des motorisations **in-bord**, embases et groupes
 * électrogènes (#574) — la moitié de la nomenclature que les 9 ensembles
 * hors-bord de #517 (`spare_parts_content.ts`) ne pouvaient pas décrire : ni
 * carburateur ni lanceur sur un diesel, mais une turbine d'eau de mer, un coude
 * d'échappement, un inverseur et un presse-étoupe.
 *
 * Mêmes règles que le contenu hors-bord :
 * - les `key` (`<ensemble>.<slug>`) sont **persistées** dans
 *   `boat_engine_repair_cart_items.part_key` : on en insère, on n'en renomme
 *   jamais ;
 * - `catalogLabel` et `catalogName` sont les intitulés EN des catalogues
 *   constructeur, affichés tels quels dans les deux locales — ce sont des
 *   identifiants de recherche, pas de l'UI copy ;
 * - le slug d'ensemble est en **kebab-case** en code (`cooling-raw-water`) et
 *   en **snake_case** en clé i18n (`parts.assemblies.cooling_raw_water`).
 *
 * `families` déclare à quelles familles de motorisation l'ensemble s'applique :
 * c'est ce qui évite de proposer un saildrive à un hors-bord, et un carburateur
 * à un diesel.
 */

/** Ensemble commun à toutes les motorisations (`controls`). */
const ALL_ENGINE_FAMILIES: readonly EngineFamily[] = ENGINE_FAMILIES

const coolingRawWaterAssembly: SparePartAssembly = {
  slug: 'cooling-raw-water',
  labelKey: 'parts.assemblies.cooling_raw_water.label',
  catalogLabel: 'RAW WATER PUMP / HEAT EXCHANGER',
  descriptionKey: 'parts.assemblies.cooling_raw_water.description',
  families: [
    'inboard_diesel_shaft',
    'inboard_diesel_saildrive',
    'inboard_petrol',
    'sterndrive',
    'pod_drive',
    'generator',
  ],
  diagnosticSheet: 'inboard-cooling',
  parts: [
    {
      key: 'cooling-raw-water.impeller',
      labelKey: 'parts.assemblies.cooling_raw_water.parts.impeller.label',
      catalogName: 'IMPELLER',
      detailKey: 'parts.assemblies.cooling_raw_water.parts.impeller.detail',
      priceKey: 'parts.assemblies.cooling_raw_water.parts.impeller.price',
    },
    {
      key: 'cooling-raw-water.pump_repair_kit',
      labelKey: 'parts.assemblies.cooling_raw_water.parts.pump_repair_kit.label',
      catalogName: 'WATER PUMP REPAIR KIT',
      detailKey: 'parts.assemblies.cooling_raw_water.parts.pump_repair_kit.detail',
      priceKey: 'parts.assemblies.cooling_raw_water.parts.pump_repair_kit.price',
    },
    {
      key: 'cooling-raw-water.pump_cover_gasket',
      labelKey: 'parts.assemblies.cooling_raw_water.parts.pump_cover_gasket.label',
      catalogName: 'GASKET, PUMP COVER',
      kitKey: 'parts.assemblies.cooling_raw_water.parts.pump_cover_gasket.kit',
      priceKey: 'parts.assemblies.cooling_raw_water.parts.pump_cover_gasket.price',
    },
    {
      key: 'cooling-raw-water.heat_exchanger_anode',
      labelKey: 'parts.assemblies.cooling_raw_water.parts.heat_exchanger_anode.label',
      catalogName: 'PENCIL ANODE',
      detailKey: 'parts.assemblies.cooling_raw_water.parts.heat_exchanger_anode.detail',
      priceKey: 'parts.assemblies.cooling_raw_water.parts.heat_exchanger_anode.price',
    },
    {
      key: 'cooling-raw-water.heat_exchanger_gasket_kit',
      labelKey: 'parts.assemblies.cooling_raw_water.parts.heat_exchanger_gasket_kit.label',
      catalogName: 'HEAT EXCHANGER GASKET KIT',
      detailKey: 'parts.assemblies.cooling_raw_water.parts.heat_exchanger_gasket_kit.detail',
      priceKey: 'parts.assemblies.cooling_raw_water.parts.heat_exchanger_gasket_kit.price',
    },
    {
      key: 'cooling-raw-water.strainer_seal',
      labelKey: 'parts.assemblies.cooling_raw_water.parts.strainer_seal.label',
      catalogName: 'STRAINER COVER SEAL',
      detailKey: 'parts.assemblies.cooling_raw_water.parts.strainer_seal.detail',
      priceKey: 'parts.assemblies.cooling_raw_water.parts.strainer_seal.price',
    },
  ],
}

const coolingFreshWaterAssembly: SparePartAssembly = {
  slug: 'cooling-fresh-water',
  labelKey: 'parts.assemblies.cooling_fresh_water.label',
  catalogLabel: 'FRESH WATER COOLING',
  descriptionKey: 'parts.assemblies.cooling_fresh_water.description',
  families: ['inboard_diesel_shaft', 'inboard_diesel_saildrive', 'generator'],
  diagnosticSheet: 'inboard-cooling',
  parts: [
    {
      key: 'cooling-fresh-water.thermostat',
      labelKey: 'parts.assemblies.cooling_fresh_water.parts.thermostat.label',
      catalogName: 'THERMOSTAT',
      detailKey: 'parts.assemblies.cooling_fresh_water.parts.thermostat.detail',
      priceKey: 'parts.assemblies.cooling_fresh_water.parts.thermostat.price',
    },
    {
      key: 'cooling-fresh-water.thermostat_gasket',
      labelKey: 'parts.assemblies.cooling_fresh_water.parts.thermostat_gasket.label',
      catalogName: 'GASKET, THERMOSTAT',
      priceKey: 'parts.assemblies.cooling_fresh_water.parts.thermostat_gasket.price',
    },
    {
      key: 'cooling-fresh-water.coolant_hose',
      labelKey: 'parts.assemblies.cooling_fresh_water.parts.coolant_hose.label',
      catalogName: 'HOSE, COOLANT',
      detailKey: 'parts.assemblies.cooling_fresh_water.parts.coolant_hose.detail',
      priceKey: 'parts.assemblies.cooling_fresh_water.parts.coolant_hose.price',
    },
    {
      key: 'cooling-fresh-water.expansion_tank_cap',
      labelKey: 'parts.assemblies.cooling_fresh_water.parts.expansion_tank_cap.label',
      catalogName: 'PRESSURE CAP',
      detailKey: 'parts.assemblies.cooling_fresh_water.parts.expansion_tank_cap.detail',
      priceKey: 'parts.assemblies.cooling_fresh_water.parts.expansion_tank_cap.price',
    },
    {
      key: 'cooling-fresh-water.circulating_pump',
      labelKey: 'parts.assemblies.cooling_fresh_water.parts.circulating_pump.label',
      catalogName: 'CIRCULATING PUMP',
      priceKey: 'parts.assemblies.cooling_fresh_water.parts.circulating_pump.price',
    },
  ],
}

const injectionAssembly: SparePartAssembly = {
  slug: 'injection',
  labelKey: 'parts.assemblies.injection.label',
  catalogLabel: 'FUEL INJECTION',
  descriptionKey: 'parts.assemblies.injection.description',
  families: ['inboard_diesel_shaft', 'inboard_diesel_saildrive', 'generator'],
  diagnosticSheet: 'diesel-fuel',
  parts: [
    {
      key: 'injection.pre_filter_element',
      labelKey: 'parts.assemblies.injection.parts.pre_filter_element.label',
      catalogName: 'FUEL FILTER / WATER SEPARATOR ELEMENT',
      detailKey: 'parts.assemblies.injection.parts.pre_filter_element.detail',
      priceKey: 'parts.assemblies.injection.parts.pre_filter_element.price',
    },
    {
      key: 'injection.fuel_filter',
      labelKey: 'parts.assemblies.injection.parts.fuel_filter.label',
      catalogName: 'FUEL FILTER ASSY',
      detailKey: 'parts.assemblies.injection.parts.fuel_filter.detail',
      priceKey: 'parts.assemblies.injection.parts.fuel_filter.price',
    },
    {
      key: 'injection.injector',
      labelKey: 'parts.assemblies.injection.parts.injector.label',
      catalogName: 'INJECTOR ASSY',
      detailKey: 'parts.assemblies.injection.parts.injector.detail',
      priceKey: 'parts.assemblies.injection.parts.injector.price',
    },
    {
      key: 'injection.injector_seal_kit',
      labelKey: 'parts.assemblies.injection.parts.injector_seal_kit.label',
      catalogName: 'INJECTOR SEAL KIT',
      kitKey: 'parts.assemblies.injection.parts.injector_seal_kit.kit',
      priceKey: 'parts.assemblies.injection.parts.injector_seal_kit.price',
    },
    {
      key: 'injection.lift_pump',
      labelKey: 'parts.assemblies.injection.parts.lift_pump.label',
      catalogName: 'FUEL FEED PUMP',
      priceKey: 'parts.assemblies.injection.parts.lift_pump.price',
    },
  ],
}

const exhaustAssembly: SparePartAssembly = {
  slug: 'exhaust',
  labelKey: 'parts.assemblies.exhaust.label',
  catalogLabel: 'EXHAUST',
  descriptionKey: 'parts.assemblies.exhaust.description',
  families: [
    'inboard_diesel_shaft',
    'inboard_diesel_saildrive',
    'inboard_petrol',
    'sterndrive',
    'pod_drive',
    'generator',
  ],
  diagnosticSheet: 'wet-exhaust',
  parts: [
    {
      key: 'exhaust.exhaust_elbow',
      labelKey: 'parts.assemblies.exhaust.parts.exhaust_elbow.label',
      catalogName: 'EXHAUST ELBOW',
      detailKey: 'parts.assemblies.exhaust.parts.exhaust_elbow.detail',
      priceKey: 'parts.assemblies.exhaust.parts.exhaust_elbow.price',
    },
    {
      key: 'exhaust.elbow_gasket',
      labelKey: 'parts.assemblies.exhaust.parts.elbow_gasket.label',
      catalogName: 'GASKET, EXHAUST ELBOW',
      kitKey: 'parts.assemblies.exhaust.parts.elbow_gasket.kit',
      priceKey: 'parts.assemblies.exhaust.parts.elbow_gasket.price',
    },
    {
      key: 'exhaust.waterlock',
      labelKey: 'parts.assemblies.exhaust.parts.waterlock.label',
      catalogName: 'WATER LOCK',
      detailKey: 'parts.assemblies.exhaust.parts.waterlock.detail',
      priceKey: 'parts.assemblies.exhaust.parts.waterlock.price',
    },
    {
      key: 'exhaust.exhaust_hose',
      labelKey: 'parts.assemblies.exhaust.parts.exhaust_hose.label',
      catalogName: 'EXHAUST HOSE',
      detailKey: 'parts.assemblies.exhaust.parts.exhaust_hose.detail',
      priceKey: 'parts.assemblies.exhaust.parts.exhaust_hose.price',
    },
    {
      key: 'exhaust.hose_clamps',
      labelKey: 'parts.assemblies.exhaust.parts.hose_clamps.label',
      catalogName: 'HOSE CLAMP, STAINLESS',
      detailKey: 'parts.assemblies.exhaust.parts.hose_clamps.detail',
      priceKey: 'parts.assemblies.exhaust.parts.hose_clamps.price',
    },
  ],
}

const gearboxAssembly: SparePartAssembly = {
  slug: 'gearbox',
  labelKey: 'parts.assemblies.gearbox.label',
  catalogLabel: 'MARINE GEAR / TRANSMISSION',
  descriptionKey: 'parts.assemblies.gearbox.description',
  families: ['inboard_diesel_shaft', 'inboard_petrol', 'sterndrive', 'pod_drive'],
  diagnosticSheet: 'gearbox',
  parts: [
    {
      key: 'gearbox.gear_oil',
      labelKey: 'parts.assemblies.gearbox.parts.gear_oil.label',
      catalogName: 'GEAR OIL',
      detailKey: 'parts.assemblies.gearbox.parts.gear_oil.detail',
      priceKey: 'parts.assemblies.gearbox.parts.gear_oil.price',
    },
    {
      key: 'gearbox.output_seal',
      labelKey: 'parts.assemblies.gearbox.parts.output_seal.label',
      catalogName: 'OIL SEAL, OUTPUT SHAFT',
      detailKey: 'parts.assemblies.gearbox.parts.output_seal.detail',
      priceKey: 'parts.assemblies.gearbox.parts.output_seal.price',
    },
    {
      key: 'gearbox.shift_cable',
      labelKey: 'parts.assemblies.gearbox.parts.shift_cable.label',
      catalogName: 'SHIFT CABLE',
      priceKey: 'parts.assemblies.gearbox.parts.shift_cable.price',
    },
    {
      key: 'gearbox.flexible_coupling',
      labelKey: 'parts.assemblies.gearbox.parts.flexible_coupling.label',
      catalogName: 'FLEXIBLE COUPLING',
      detailKey: 'parts.assemblies.gearbox.parts.flexible_coupling.detail',
      priceKey: 'parts.assemblies.gearbox.parts.flexible_coupling.price',
    },
    {
      key: 'gearbox.damper_plate',
      labelKey: 'parts.assemblies.gearbox.parts.damper_plate.label',
      catalogName: 'DAMPER PLATE',
      detailKey: 'parts.assemblies.gearbox.parts.damper_plate.detail',
      priceKey: 'parts.assemblies.gearbox.parts.damper_plate.price',
    },
  ],
}

const saildriveAssembly: SparePartAssembly = {
  slug: 'saildrive',
  labelKey: 'parts.assemblies.saildrive.label',
  catalogLabel: 'SAIL DRIVE',
  descriptionKey: 'parts.assemblies.saildrive.description',
  families: ['inboard_diesel_saildrive'],
  diagnosticSheet: 'saildrive',
  parts: [
    {
      key: 'saildrive.diaphragm',
      labelKey: 'parts.assemblies.saildrive.parts.diaphragm.label',
      catalogName: 'RUBBER DIAPHRAGM',
      detailKey: 'parts.assemblies.saildrive.parts.diaphragm.detail',
      priceKey: 'parts.assemblies.saildrive.parts.diaphragm.price',
    },
    {
      key: 'saildrive.anode',
      labelKey: 'parts.assemblies.saildrive.parts.anode.label',
      catalogName: 'ANODE, SAIL DRIVE',
      detailKey: 'parts.assemblies.saildrive.parts.anode.detail',
      priceKey: 'parts.assemblies.saildrive.parts.anode.price',
    },
    {
      key: 'saildrive.oil_seal',
      labelKey: 'parts.assemblies.saildrive.parts.oil_seal.label',
      catalogName: 'OIL SEAL',
      detailKey: 'parts.assemblies.saildrive.parts.oil_seal.detail',
      priceKey: 'parts.assemblies.saildrive.parts.oil_seal.price',
    },
    {
      key: 'saildrive.gear_oil',
      labelKey: 'parts.assemblies.saildrive.parts.gear_oil.label',
      catalogName: 'GEAR OIL',
      priceKey: 'parts.assemblies.saildrive.parts.gear_oil.price',
    },
  ],
}

const sterndriveAssembly: SparePartAssembly = {
  slug: 'sterndrive',
  labelKey: 'parts.assemblies.sterndrive.label',
  catalogLabel: 'STERN DRIVE',
  descriptionKey: 'parts.assemblies.sterndrive.description',
  families: ['sterndrive'],
  parts: [
    {
      key: 'sterndrive.bellows_kit',
      labelKey: 'parts.assemblies.sterndrive.parts.bellows_kit.label',
      catalogName: 'BELLOWS KIT',
      detailKey: 'parts.assemblies.sterndrive.parts.bellows_kit.detail',
      priceKey: 'parts.assemblies.sterndrive.parts.bellows_kit.price',
    },
    {
      key: 'sterndrive.u_joint',
      labelKey: 'parts.assemblies.sterndrive.parts.u_joint.label',
      catalogName: 'UNIVERSAL JOINT',
      detailKey: 'parts.assemblies.sterndrive.parts.u_joint.detail',
      priceKey: 'parts.assemblies.sterndrive.parts.u_joint.price',
    },
    {
      key: 'sterndrive.trim_cylinder',
      labelKey: 'parts.assemblies.sterndrive.parts.trim_cylinder.label',
      catalogName: 'TRIM CYLINDER',
      priceKey: 'parts.assemblies.sterndrive.parts.trim_cylinder.price',
    },
    {
      key: 'sterndrive.anode_kit',
      labelKey: 'parts.assemblies.sterndrive.parts.anode_kit.label',
      catalogName: 'ANODE KIT',
      detailKey: 'parts.assemblies.sterndrive.parts.anode_kit.detail',
      priceKey: 'parts.assemblies.sterndrive.parts.anode_kit.price',
    },
    {
      key: 'sterndrive.gimbal_bearing',
      labelKey: 'parts.assemblies.sterndrive.parts.gimbal_bearing.label',
      catalogName: 'GIMBAL BEARING',
      detailKey: 'parts.assemblies.sterndrive.parts.gimbal_bearing.detail',
      priceKey: 'parts.assemblies.sterndrive.parts.gimbal_bearing.price',
    },
  ],
}

const shaftLineAssembly: SparePartAssembly = {
  slug: 'shaft-line',
  labelKey: 'parts.assemblies.shaft_line.label',
  catalogLabel: 'SHAFT / STERN TUBE',
  descriptionKey: 'parts.assemblies.shaft_line.description',
  families: ['inboard_diesel_shaft', 'inboard_petrol', 'electric_inboard'],
  diagnosticSheet: 'shaft-line',
  parts: [
    {
      key: 'shaft-line.stuffing_box_packing',
      labelKey: 'parts.assemblies.shaft_line.parts.stuffing_box_packing.label',
      catalogName: 'PACKING, STUFFING BOX',
      detailKey: 'parts.assemblies.shaft_line.parts.stuffing_box_packing.detail',
      priceKey: 'parts.assemblies.shaft_line.parts.stuffing_box_packing.price',
    },
    {
      key: 'shaft-line.stuffing_box',
      labelKey: 'parts.assemblies.shaft_line.parts.stuffing_box.label',
      catalogName: 'STUFFING BOX ASSY',
      detailKey: 'parts.assemblies.shaft_line.parts.stuffing_box.detail',
      priceKey: 'parts.assemblies.shaft_line.parts.stuffing_box.price',
    },
    {
      key: 'shaft-line.cutless_bearing',
      labelKey: 'parts.assemblies.shaft_line.parts.cutless_bearing.label',
      catalogName: 'CUTLESS BEARING',
      detailKey: 'parts.assemblies.shaft_line.parts.cutless_bearing.detail',
      priceKey: 'parts.assemblies.shaft_line.parts.cutless_bearing.price',
    },
    {
      key: 'shaft-line.shaft',
      labelKey: 'parts.assemblies.shaft_line.parts.shaft.label',
      catalogName: 'PROPELLER SHAFT',
      priceKey: 'parts.assemblies.shaft_line.parts.shaft.price',
    },
    {
      key: 'shaft-line.shaft_anode',
      labelKey: 'parts.assemblies.shaft_line.parts.shaft_anode.label',
      catalogName: 'SHAFT ANODE',
      detailKey: 'parts.assemblies.shaft_line.parts.shaft_anode.detail',
      priceKey: 'parts.assemblies.shaft_line.parts.shaft_anode.price',
    },
  ],
}

const startingChargingAssembly: SparePartAssembly = {
  slug: 'starting-charging',
  labelKey: 'parts.assemblies.starting_charging.label',
  catalogLabel: 'STARTER / ALTERNATOR',
  descriptionKey: 'parts.assemblies.starting_charging.description',
  families: [
    'outboard_2t',
    'outboard_4t',
    'inboard_diesel_shaft',
    'inboard_diesel_saildrive',
    'inboard_petrol',
    'sterndrive',
    'pod_drive',
    'jet',
    'hybrid',
    'generator',
  ],
  diagnosticSheet: 'electrical',
  parts: [
    {
      key: 'starting-charging.starter_motor',
      labelKey: 'parts.assemblies.starting_charging.parts.starter_motor.label',
      catalogName: 'STARTER MOTOR ASSY',
      detailKey: 'parts.assemblies.starting_charging.parts.starter_motor.detail',
      priceKey: 'parts.assemblies.starting_charging.parts.starter_motor.price',
    },
    {
      key: 'starting-charging.starter_solenoid',
      labelKey: 'parts.assemblies.starting_charging.parts.starter_solenoid.label',
      catalogName: 'SOLENOID, STARTER',
      priceKey: 'parts.assemblies.starting_charging.parts.starter_solenoid.price',
    },
    {
      key: 'starting-charging.alternator',
      labelKey: 'parts.assemblies.starting_charging.parts.alternator.label',
      catalogName: 'ALTERNATOR ASSY',
      priceKey: 'parts.assemblies.starting_charging.parts.alternator.price',
    },
    {
      key: 'starting-charging.drive_belt',
      labelKey: 'parts.assemblies.starting_charging.parts.drive_belt.label',
      catalogName: 'V-BELT',
      detailKey: 'parts.assemblies.starting_charging.parts.drive_belt.detail',
      priceKey: 'parts.assemblies.starting_charging.parts.drive_belt.price',
    },
    {
      key: 'starting-charging.voltage_regulator',
      labelKey: 'parts.assemblies.starting_charging.parts.voltage_regulator.label',
      catalogName: 'VOLTAGE REGULATOR',
      priceKey: 'parts.assemblies.starting_charging.parts.voltage_regulator.price',
    },
  ],
}

const lubricationAssembly: SparePartAssembly = {
  slug: 'lubrication',
  labelKey: 'parts.assemblies.lubrication.label',
  catalogLabel: 'LUBRICATION',
  descriptionKey: 'parts.assemblies.lubrication.description',
  families: [
    'outboard_4t',
    'inboard_diesel_shaft',
    'inboard_diesel_saildrive',
    'inboard_petrol',
    'sterndrive',
    'pod_drive',
    'generator',
  ],
  parts: [
    {
      key: 'lubrication.oil_filter',
      labelKey: 'parts.assemblies.lubrication.parts.oil_filter.label',
      catalogName: 'OIL FILTER',
      detailKey: 'parts.assemblies.lubrication.parts.oil_filter.detail',
      priceKey: 'parts.assemblies.lubrication.parts.oil_filter.price',
    },
    {
      key: 'lubrication.engine_oil',
      labelKey: 'parts.assemblies.lubrication.parts.engine_oil.label',
      catalogName: 'ENGINE OIL',
      detailKey: 'parts.assemblies.lubrication.parts.engine_oil.detail',
      priceKey: 'parts.assemblies.lubrication.parts.engine_oil.price',
    },
    {
      key: 'lubrication.oil_pump',
      labelKey: 'parts.assemblies.lubrication.parts.oil_pump.label',
      catalogName: 'OIL PUMP ASSY',
      priceKey: 'parts.assemblies.lubrication.parts.oil_pump.price',
    },
    {
      key: 'lubrication.sump_gasket',
      labelKey: 'parts.assemblies.lubrication.parts.sump_gasket.label',
      catalogName: 'GASKET, OIL SUMP',
      priceKey: 'parts.assemblies.lubrication.parts.sump_gasket.price',
    },
  ],
}

const airIntakeAssembly: SparePartAssembly = {
  slug: 'air-intake',
  labelKey: 'parts.assemblies.air_intake.label',
  catalogLabel: 'AIR INTAKE / TURBO',
  descriptionKey: 'parts.assemblies.air_intake.description',
  families: ['inboard_diesel_shaft', 'inboard_diesel_saildrive', 'generator'],
  diagnosticSheet: 'diesel-smoke',
  parts: [
    {
      key: 'air-intake.air_filter',
      labelKey: 'parts.assemblies.air_intake.parts.air_filter.label',
      catalogName: 'AIR FILTER ELEMENT',
      detailKey: 'parts.assemblies.air_intake.parts.air_filter.detail',
      priceKey: 'parts.assemblies.air_intake.parts.air_filter.price',
    },
    {
      key: 'air-intake.turbocharger',
      labelKey: 'parts.assemblies.air_intake.parts.turbocharger.label',
      catalogName: 'TURBOCHARGER ASSY',
      detailKey: 'parts.assemblies.air_intake.parts.turbocharger.detail',
      priceKey: 'parts.assemblies.air_intake.parts.turbocharger.price',
    },
    {
      key: 'air-intake.intercooler_gasket_kit',
      labelKey: 'parts.assemblies.air_intake.parts.intercooler_gasket_kit.label',
      catalogName: 'INTERCOOLER GASKET KIT',
      priceKey: 'parts.assemblies.air_intake.parts.intercooler_gasket_kit.price',
    },
    {
      key: 'air-intake.intake_hose',
      labelKey: 'parts.assemblies.air_intake.parts.intake_hose.label',
      catalogName: 'HOSE, AIR INTAKE',
      priceKey: 'parts.assemblies.air_intake.parts.intake_hose.price',
    },
    {
      key: 'air-intake.breather_filter',
      labelKey: 'parts.assemblies.air_intake.parts.breather_filter.label',
      catalogName: 'BREATHER FILTER',
      detailKey: 'parts.assemblies.air_intake.parts.breather_filter.detail',
      priceKey: 'parts.assemblies.air_intake.parts.breather_filter.price',
    },
  ],
}

const controlsAssembly: SparePartAssembly = {
  slug: 'controls',
  labelKey: 'parts.assemblies.controls.label',
  catalogLabel: 'REMOTE CONTROL',
  descriptionKey: 'parts.assemblies.controls.description',
  families: ALL_ENGINE_FAMILIES,
  parts: [
    {
      key: 'controls.control_box',
      labelKey: 'parts.assemblies.controls.parts.control_box.label',
      catalogName: 'REMOTE CONTROL BOX ASSY',
      priceKey: 'parts.assemblies.controls.parts.control_box.price',
    },
    {
      key: 'controls.throttle_cable',
      labelKey: 'parts.assemblies.controls.parts.throttle_cable.label',
      catalogName: 'THROTTLE CABLE',
      detailKey: 'parts.assemblies.controls.parts.throttle_cable.detail',
      priceKey: 'parts.assemblies.controls.parts.throttle_cable.price',
    },
    {
      key: 'controls.steering_seal_kit',
      labelKey: 'parts.assemblies.controls.parts.steering_seal_kit.label',
      catalogName: 'HYDRAULIC STEERING SEAL KIT',
      detailKey: 'parts.assemblies.controls.parts.steering_seal_kit.detail',
      priceKey: 'parts.assemblies.controls.parts.steering_seal_kit.price',
    },
    {
      key: 'controls.key_switch',
      labelKey: 'parts.assemblies.controls.parts.key_switch.label',
      catalogName: 'MAIN SWITCH ASSY',
      priceKey: 'parts.assemblies.controls.parts.key_switch.price',
    },
  ],
}
/**
 * Ensembles in-bord, dans l'ordre d'affichage : refroidissement et carburant
 * d'abord (les pannes les plus courantes), transmission ensuite, périphériques
 * pour finir.
 */
export const INBOARD_SPARE_PART_ASSEMBLIES = {
  'cooling-raw-water': coolingRawWaterAssembly,
  'cooling-fresh-water': coolingFreshWaterAssembly,
  'injection': injectionAssembly,
  'exhaust': exhaustAssembly,
  'gearbox': gearboxAssembly,
  'saildrive': saildriveAssembly,
  'sterndrive': sterndriveAssembly,
  'shaft-line': shaftLineAssembly,
  'starting-charging': startingChargingAssembly,
  'lubrication': lubricationAssembly,
  'air-intake': airIntakeAssembly,
  'controls': controlsAssembly,
} as const
