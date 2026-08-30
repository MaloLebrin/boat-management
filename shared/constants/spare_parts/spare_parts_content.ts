import { INBOARD_SPARE_PART_ASSEMBLIES } from '#shared/constants/spare_parts/inboard_assemblies'
import type { DiagnosticSheetSlug } from '#shared/types/diagnostic'
import type { EngineFamily } from '#shared/types/engine_catalog'
import type {
  PartAssemblySlug,
  SparePartAssembly,
  SparePartCatalogEntry,
  SparePartsBrandSlug,
  SparePartsRetailerLink,
  UnreferencedPartItem,
} from '#shared/types/spare_parts'

/**
 * Contenu statique de l'identification des pièces détachées : ensembles
 * fonctionnels, pièces courantes, pièces sans référence et liens revendeurs.
 *
 * Les aides plaque signalétique ont quitté ce fichier avec #575 : elles sont
 * désormais portées par `engine_brands` (`plate_location_key`,
 * `plate_example_key`) et couvrent tout le catalogue de #573, là où le tableau
 * statique s'arrêtait à trois marques.
 *
 * Ce fichier porte les **neuf ensembles hors-bord** de l'issue #517 et agrège
 * les **douze ensembles in-bord** de #574
 * (`inboard_assemblies.ts`) — l'index à plat, les clés persistables et les
 * liens revendeurs restent communs.
 *
 * Les `key` des pièces sont persistées en base
 * (`boat_engine_repair_cart_items.part_key`) et ne doivent JAMAIS être
 * renommées ; on peut en insérer de nouvelles à n'importe quelle position.
 *
 * Les intitulés catalogue (`catalogName`, `catalogLabel`) sont les termes EN
 * officiels des catalogues constructeur, affichés tels quels dans les deux
 * locales — ce sont des identifiants de recherche, pas de l'UI copy.
 */

/**
 * Les deux familles hors-bord partagent la quasi-totalité de la nomenclature de
 * #517 : seule `lubrication` (#574) est propre au 4 temps, et seul le 2 temps
 * mélange l'huile au carburant. D'où la constante commune.
 */
const OUTBOARD_FAMILIES: readonly EngineFamily[] = ['outboard_2t', 'outboard_4t']

const carburetorAssembly: SparePartAssembly = {
  slug: 'carburetor',
  labelKey: 'parts.assemblies.carburetor.label',
  catalogLabel: 'CARBURETOR',
  descriptionKey: 'parts.assemblies.carburetor.description',
  families: [...OUTBOARD_FAMILIES, 'jet'],
  yamahaFunctionCode: '14301',
  diagnosticSheet: 'fuel',
  parts: [
    {
      key: 'carburetor.repair_kit',
      labelKey: 'parts.assemblies.carburetor.parts.repair_kit.label',
      catalogName: 'CARBURETOR REPAIR KIT',
      detailKey: 'parts.assemblies.carburetor.parts.repair_kit.detail',
      priceKey: 'parts.assemblies.carburetor.parts.repair_kit.price',
    },
    {
      key: 'carburetor.float_chamber_gasket',
      labelKey: 'parts.assemblies.carburetor.parts.float_chamber_gasket.label',
      catalogName: 'GASKET, FLOAT CHAMBER',
      kitKey: 'parts.assemblies.carburetor.parts.float_chamber_gasket.kit',
      priceKey: 'parts.assemblies.carburetor.parts.float_chamber_gasket.price',
    },
    {
      key: 'carburetor.needle_valve',
      labelKey: 'parts.assemblies.carburetor.parts.needle_valve.label',
      catalogName: 'NEEDLE VALVE ASSY',
      kitKey: 'parts.assemblies.carburetor.parts.needle_valve.kit',
      priceKey: 'parts.assemblies.carburetor.parts.needle_valve.price',
    },
    {
      key: 'carburetor.main_jet',
      labelKey: 'parts.assemblies.carburetor.parts.main_jet.label',
      catalogName: 'JET, MAIN',
      detailKey: 'parts.assemblies.carburetor.parts.main_jet.detail',
      priceKey: 'parts.assemblies.carburetor.parts.main_jet.price',
    },
    {
      key: 'carburetor.pilot_jet',
      labelKey: 'parts.assemblies.carburetor.parts.pilot_jet.label',
      catalogName: 'JET, PILOT',
      priceKey: 'parts.assemblies.carburetor.parts.pilot_jet.price',
    },
    {
      key: 'carburetor.float',
      labelKey: 'parts.assemblies.carburetor.parts.float.label',
      catalogName: 'FLOAT',
      detailKey: 'parts.assemblies.carburetor.parts.float.detail',
      priceKey: 'parts.assemblies.carburetor.parts.float.price',
    },
    {
      key: 'carburetor.pilot_screw',
      labelKey: 'parts.assemblies.carburetor.parts.pilot_screw.label',
      catalogName: 'SCREW, PILOT',
      priceKey: 'parts.assemblies.carburetor.parts.pilot_screw.price',
    },
  ],
}

const fuelSystemAssembly: SparePartAssembly = {
  slug: 'fuel-system',
  labelKey: 'parts.assemblies.fuel_system.label',
  catalogLabel: 'FUEL TANK / FUEL PUMP',
  descriptionKey: 'parts.assemblies.fuel_system.description',
  families: [...OUTBOARD_FAMILIES, 'jet'],
  diagnosticSheet: 'fuel',
  parts: [
    {
      key: 'fuel-system.fuel_pump_kit',
      labelKey: 'parts.assemblies.fuel_system.parts.fuel_pump_kit.label',
      catalogName: 'FUEL PUMP REPAIR KIT',
      detailKey: 'parts.assemblies.fuel_system.parts.fuel_pump_kit.detail',
      priceKey: 'parts.assemblies.fuel_system.parts.fuel_pump_kit.price',
    },
    {
      key: 'fuel-system.fuel_pump_diaphragm',
      labelKey: 'parts.assemblies.fuel_system.parts.fuel_pump_diaphragm.label',
      catalogName: 'DIAPHRAGM, FUEL PUMP',
      kitKey: 'parts.assemblies.fuel_system.parts.fuel_pump_diaphragm.kit',
      priceKey: 'parts.assemblies.fuel_system.parts.fuel_pump_diaphragm.price',
    },
    {
      key: 'fuel-system.fuel_filter',
      labelKey: 'parts.assemblies.fuel_system.parts.fuel_filter.label',
      catalogName: 'FUEL FILTER ASSY',
      priceKey: 'parts.assemblies.fuel_system.parts.fuel_filter.price',
    },
    {
      key: 'fuel-system.primer_bulb',
      labelKey: 'parts.assemblies.fuel_system.parts.primer_bulb.label',
      catalogName: 'PRIMER PUMP ASSY',
      detailKey: 'parts.assemblies.fuel_system.parts.primer_bulb.detail',
      priceKey: 'parts.assemblies.fuel_system.parts.primer_bulb.price',
    },
    {
      key: 'fuel-system.fuel_connector',
      labelKey: 'parts.assemblies.fuel_system.parts.fuel_connector.label',
      catalogName: 'FUEL PIPE JOINT',
      priceKey: 'parts.assemblies.fuel_system.parts.fuel_connector.price',
    },
  ],
}

const ignitionAssembly: SparePartAssembly = {
  slug: 'ignition',
  labelKey: 'parts.assemblies.ignition.label',
  catalogLabel: 'ELECTRICAL / CDI',
  descriptionKey: 'parts.assemblies.ignition.description',
  families: [...OUTBOARD_FAMILIES, 'jet'],
  diagnosticSheet: 'ignition',
  parts: [
    {
      key: 'ignition.cdi_unit',
      labelKey: 'parts.assemblies.ignition.parts.cdi_unit.label',
      catalogName: 'CDI UNIT ASSY',
      detailKey: 'parts.assemblies.ignition.parts.cdi_unit.detail',
      priceKey: 'parts.assemblies.ignition.parts.cdi_unit.price',
    },
    {
      key: 'ignition.ignition_coil',
      labelKey: 'parts.assemblies.ignition.parts.ignition_coil.label',
      catalogName: 'IGNITION COIL ASSY',
      priceKey: 'parts.assemblies.ignition.parts.ignition_coil.price',
    },
    {
      key: 'ignition.charge_coil',
      labelKey: 'parts.assemblies.ignition.parts.charge_coil.label',
      catalogName: 'CHARGE COIL ASSY',
      priceKey: 'parts.assemblies.ignition.parts.charge_coil.price',
    },
    {
      key: 'ignition.pulser_coil',
      labelKey: 'parts.assemblies.ignition.parts.pulser_coil.label',
      catalogName: 'PULSER COIL ASSY',
      priceKey: 'parts.assemblies.ignition.parts.pulser_coil.price',
    },
    {
      key: 'ignition.stop_switch',
      labelKey: 'parts.assemblies.ignition.parts.stop_switch.label',
      catalogName: 'ENGINE STOP SWITCH ASSY',
      detailKey: 'parts.assemblies.ignition.parts.stop_switch.detail',
      priceKey: 'parts.assemblies.ignition.parts.stop_switch.price',
    },
  ],
}

const powerUnitAssembly: SparePartAssembly = {
  slug: 'power-unit',
  labelKey: 'parts.assemblies.power_unit.label',
  catalogLabel: 'POWER UNIT / CYLINDER CRANKCASE',
  descriptionKey: 'parts.assemblies.power_unit.description',
  families: [...OUTBOARD_FAMILIES, 'jet'],
  diagnosticSheet: 'compression',
  parts: [
    {
      key: 'power-unit.head_gasket',
      labelKey: 'parts.assemblies.power_unit.parts.head_gasket.label',
      catalogName: 'GASKET, CYLINDER HEAD',
      detailKey: 'parts.assemblies.power_unit.parts.head_gasket.detail',
      priceKey: 'parts.assemblies.power_unit.parts.head_gasket.price',
    },
    {
      key: 'power-unit.piston_ring_set',
      labelKey: 'parts.assemblies.power_unit.parts.piston_ring_set.label',
      catalogName: 'PISTON RING SET',
      priceKey: 'parts.assemblies.power_unit.parts.piston_ring_set.price',
    },
    {
      key: 'power-unit.gasket_kit',
      labelKey: 'parts.assemblies.power_unit.parts.gasket_kit.label',
      catalogName: 'POWER HEAD GASKET KIT',
      detailKey: 'parts.assemblies.power_unit.parts.gasket_kit.detail',
      priceKey: 'parts.assemblies.power_unit.parts.gasket_kit.price',
    },
    {
      key: 'power-unit.thermostat',
      labelKey: 'parts.assemblies.power_unit.parts.thermostat.label',
      catalogName: 'THERMOSTAT',
      priceKey: 'parts.assemblies.power_unit.parts.thermostat.price',
    },
    {
      key: 'power-unit.anode',
      labelKey: 'parts.assemblies.power_unit.parts.anode.label',
      catalogName: 'ANODE',
      detailKey: 'parts.assemblies.power_unit.parts.anode.detail',
      priceKey: 'parts.assemblies.power_unit.parts.anode.price',
    },
  ],
}

const recoilStarterAssembly: SparePartAssembly = {
  slug: 'recoil-starter',
  labelKey: 'parts.assemblies.recoil_starter.label',
  catalogLabel: 'STARTER, RECOIL',
  descriptionKey: 'parts.assemblies.recoil_starter.description',
  families: OUTBOARD_FAMILIES,
  parts: [
    {
      key: 'recoil-starter.starter_rope',
      labelKey: 'parts.assemblies.recoil_starter.parts.starter_rope.label',
      catalogName: 'ROPE, STARTER',
      detailKey: 'parts.assemblies.recoil_starter.parts.starter_rope.detail',
      priceKey: 'parts.assemblies.recoil_starter.parts.starter_rope.price',
    },
    {
      key: 'recoil-starter.spiral_spring',
      labelKey: 'parts.assemblies.recoil_starter.parts.spiral_spring.label',
      catalogName: 'SPIRAL SPRING',
      priceKey: 'parts.assemblies.recoil_starter.parts.spiral_spring.price',
    },
    {
      key: 'recoil-starter.drive_pawl',
      labelKey: 'parts.assemblies.recoil_starter.parts.drive_pawl.label',
      catalogName: 'DRIVE PAWL',
      priceKey: 'parts.assemblies.recoil_starter.parts.drive_pawl.price',
    },
    {
      key: 'recoil-starter.starter_handle',
      labelKey: 'parts.assemblies.recoil_starter.parts.starter_handle.label',
      catalogName: 'STARTER HANDLE',
      priceKey: 'parts.assemblies.recoil_starter.parts.starter_handle.price',
    },
  ],
}

const lowerUnitAssembly: SparePartAssembly = {
  slug: 'lower-unit',
  labelKey: 'parts.assemblies.lower_unit.label',
  catalogLabel: 'LOWER CASING / WATER PUMP',
  descriptionKey: 'parts.assemblies.lower_unit.description',
  families: OUTBOARD_FAMILIES,
  diagnosticSheet: 'cooling',
  parts: [
    {
      key: 'lower-unit.impeller',
      labelKey: 'parts.assemblies.lower_unit.parts.impeller.label',
      catalogName: 'IMPELLER',
      detailKey: 'parts.assemblies.lower_unit.parts.impeller.detail',
      priceKey: 'parts.assemblies.lower_unit.parts.impeller.price',
      yamahaFunctionCode: '44352',
    },
    {
      key: 'lower-unit.water_pump_kit',
      labelKey: 'parts.assemblies.lower_unit.parts.water_pump_kit.label',
      catalogName: 'WATER PUMP REPAIR KIT',
      detailKey: 'parts.assemblies.lower_unit.parts.water_pump_kit.detail',
      priceKey: 'parts.assemblies.lower_unit.parts.water_pump_kit.price',
    },
    {
      key: 'lower-unit.gearcase_seal_kit',
      labelKey: 'parts.assemblies.lower_unit.parts.gearcase_seal_kit.label',
      catalogName: 'GEAR HOUSING SEAL KIT',
      priceKey: 'parts.assemblies.lower_unit.parts.gearcase_seal_kit.price',
    },
    {
      key: 'lower-unit.drain_screw_gasket',
      labelKey: 'parts.assemblies.lower_unit.parts.drain_screw_gasket.label',
      catalogName: 'GASKET, DRAIN SCREW',
      detailKey: 'parts.assemblies.lower_unit.parts.drain_screw_gasket.detail',
      priceKey: 'parts.assemblies.lower_unit.parts.drain_screw_gasket.price',
    },
  ],
}

const propellerAssembly: SparePartAssembly = {
  slug: 'propeller',
  labelKey: 'parts.assemblies.propeller.label',
  catalogLabel: 'PROPELLER',
  descriptionKey: 'parts.assemblies.propeller.description',
  families: [...OUTBOARD_FAMILIES, 'electric_outboard', 'sterndrive'],
  diagnosticSheet: 'gearcase',
  parts: [
    {
      key: 'propeller.propeller',
      labelKey: 'parts.assemblies.propeller.parts.propeller.label',
      catalogName: 'PROPELLER',
      detailKey: 'parts.assemblies.propeller.parts.propeller.detail',
      priceKey: 'parts.assemblies.propeller.parts.propeller.price',
    },
    {
      key: 'propeller.propeller_nut',
      labelKey: 'parts.assemblies.propeller.parts.propeller_nut.label',
      catalogName: 'NUT, PROPELLER',
      priceKey: 'parts.assemblies.propeller.parts.propeller_nut.price',
    },
    {
      key: 'propeller.thrust_washer',
      labelKey: 'parts.assemblies.propeller.parts.thrust_washer.label',
      catalogName: 'WASHER, THRUST',
      priceKey: 'parts.assemblies.propeller.parts.thrust_washer.price',
    },
  ],
}

const cowlingAssembly: SparePartAssembly = {
  slug: 'cowling',
  labelKey: 'parts.assemblies.cowling.label',
  catalogLabel: 'COWLING / BOTTOM COWLING',
  descriptionKey: 'parts.assemblies.cowling.description',
  families: [...OUTBOARD_FAMILIES, 'electric_outboard'],
  parts: [
    {
      key: 'cowling.cowling_hook',
      labelKey: 'parts.assemblies.cowling.parts.cowling_hook.label',
      catalogName: 'HOOK, COWLING',
      priceKey: 'parts.assemblies.cowling.parts.cowling_hook.price',
    },
    {
      key: 'cowling.cowling_seal',
      labelKey: 'parts.assemblies.cowling.parts.cowling_seal.label',
      catalogName: 'SEAL, BOTTOM COWLING',
      detailKey: 'parts.assemblies.cowling.parts.cowling_seal.detail',
      priceKey: 'parts.assemblies.cowling.parts.cowling_seal.price',
    },
  ],
}

const bracketAssembly: SparePartAssembly = {
  slug: 'bracket',
  labelKey: 'parts.assemblies.bracket.label',
  catalogLabel: 'BRACKET / SWIVEL',
  descriptionKey: 'parts.assemblies.bracket.description',
  families: [...OUTBOARD_FAMILIES, 'electric_outboard'],
  parts: [
    {
      key: 'bracket.clamp_screw',
      labelKey: 'parts.assemblies.bracket.parts.clamp_screw.label',
      catalogName: 'SCREW, CLAMP',
      priceKey: 'parts.assemblies.bracket.parts.clamp_screw.price',
    },
    {
      key: 'bracket.tilt_pin',
      labelKey: 'parts.assemblies.bracket.parts.tilt_pin.label',
      catalogName: 'PIN, TILT',
      priceKey: 'parts.assemblies.bracket.parts.tilt_pin.price',
    },
    {
      key: 'bracket.anode',
      labelKey: 'parts.assemblies.bracket.parts.anode.label',
      catalogName: 'ANODE',
      detailKey: 'parts.assemblies.bracket.parts.anode.detail',
      priceKey: 'parts.assemblies.bracket.parts.anode.price',
    },
  ],
}

/**
 * Catalogue complet, hors-bord puis in-bord. L'ordre est celui de l'affichage
 * quand une famille les retient tous ; `assembliesForEngineFamily()`
 * (`#shared/helpers/spare_parts`) le filtre sans le réordonner.
 */
export const SPARE_PART_ASSEMBLIES: Record<PartAssemblySlug, SparePartAssembly> = {
  'carburetor': carburetorAssembly,
  'fuel-system': fuelSystemAssembly,
  'ignition': ignitionAssembly,
  'power-unit': powerUnitAssembly,
  'recoil-starter': recoilStarterAssembly,
  'lower-unit': lowerUnitAssembly,
  'propeller': propellerAssembly,
  'cowling': cowlingAssembly,
  'bracket': bracketAssembly,
  ...INBOARD_SPARE_PART_ASSEMBLIES,
}

/** Étape 4 — pièces qui ne nécessitent pas de référence constructeur. */
export const UNREFERENCED_PARTS: readonly UnreferencedPartItem[] = [
  {
    key: 'unreferenced.fuel_hose',
    labelKey: 'parts.unreferenced.items.fuel_hose.label',
    adviceKey: 'parts.unreferenced.items.fuel_hose.advice',
  },
  {
    key: 'unreferenced.clamps_orings',
    labelKey: 'parts.unreferenced.items.clamps_orings.label',
    adviceKey: 'parts.unreferenced.items.clamps_orings.advice',
  },
  {
    key: 'unreferenced.spark_plug',
    labelKey: 'parts.unreferenced.items.spark_plug.label',
    adviceKey: 'parts.unreferenced.items.spark_plug.advice',
  },
  {
    key: 'unreferenced.shear_pin',
    labelKey: 'parts.unreferenced.items.shear_pin.label',
    adviceKey: 'parts.unreferenced.items.shear_pin.advice',
  },
  {
    key: 'unreferenced.consumables',
    labelKey: 'parts.unreferenced.items.consumables.label',
    adviceKey: 'parts.unreferenced.items.consumables.advice',
  },
]

/**
 * Liens sortants vers les catalogues revendeurs (vues éclatées) — solution
 * retenue pour la v1 (contenus des catalogues sous droits). Noms et URL
 * littéraux : noms propres, identiques dans les deux locales.
 */
export const SPARE_PARTS_RETAILERS: Record<SparePartsBrandSlug, readonly SparePartsRetailerLink[]> =
  {
    'yamaha': [
      { id: 'partzilla', name: 'Partzilla', url: 'https://www.partzilla.com/catalog/yamaha' },
      { id: 'boatsnet', name: 'Boats.net', url: 'https://www.boats.net/catalog/yamaha' },
    ],
    'johnson-evinrude': [
      {
        id: 'crowleymarine',
        name: 'Crowley Marine',
        url: 'https://www.crowleymarine.com/johnson-evinrude',
      },
      { id: 'boatsnet', name: 'Boats.net', url: 'https://www.boats.net/catalog/johnson' },
    ],
    'mercury-mariner': [
      { id: 'partzilla', name: 'Partzilla', url: 'https://www.partzilla.com/catalog/mercury' },
      { id: 'crowleymarine', name: 'Crowley Marine', url: 'https://www.crowleymarine.com/mercury' },
    ],
  }

/** Revendeurs génériques quand la marque du moteur n'est pas reconnue. */
export const GENERIC_RETAILERS: readonly SparePartsRetailerLink[] = [
  { id: 'partzilla', name: 'Partzilla', url: 'https://www.partzilla.com/' },
  { id: 'boatsnet', name: 'Boats.net', url: 'https://www.boats.net/' },
  { id: 'crowleymarine', name: 'Crowley Marine', url: 'https://www.crowleymarine.com/' },
]

/**
 * Fiche de diagnostic (#515, #576) → ensemble de pièces concerné, pour le lien
 * direct « identifier les pièces » depuis les checklists (ex. fiche 3
 * « carburateur » → éclaté CARBURETOR).
 *
 * La table est la **réciproque** de `SparePartAssembly.diagnosticSheet` : pour
 * toute entrée `fiche → ensemble`, l'ensemble doit renvoyer vers cette même
 * fiche, et toute fiche citée par un ensemble doit figurer ici. L'invariant est
 * testé (`tests/inertia/spare_parts_content.spec.ts`) — il ne tenait pas avant
 * #576 : `gearcase` pointait vers `lower-unit`, qui renvoie vers `cooling`, et
 * `electrical` vers `ignition`, qui n'a jamais renvoyé vers `electrical`.
 */
export const DIAGNOSTIC_SHEET_TO_ASSEMBLY: Partial<Record<DiagnosticSheetSlug, PartAssemblySlug>> =
  {
    'compression': 'power-unit',
    'ignition': 'ignition',
    'fuel': 'carburetor',
    'cooling': 'lower-unit',
    'gearcase': 'propeller',
    'electrical': 'starting-charging',
    'inboard-cooling': 'cooling-raw-water',
    'diesel-fuel': 'injection',
    'diesel-smoke': 'air-intake',
    'wet-exhaust': 'exhaust',
    'gearbox': 'gearbox',
    'shaft-line': 'shaft-line',
    'saildrive': 'saildrive',
  }

/** Index à plat du catalogue (ensembles + pièces sans référence), par clé. */
export const SPARE_PART_CATALOG_INDEX: ReadonlyMap<string, SparePartCatalogEntry> = new Map<
  string,
  SparePartCatalogEntry
>([
  ...Object.values(SPARE_PART_ASSEMBLIES).flatMap((assembly) =>
    assembly.parts.map(
      (part) =>
        [
          part.key,
          {
            key: part.key,
            labelKey: part.labelKey,
            catalogName: part.catalogName,
            assemblySlug: assembly.slug,
            assemblyLabelKey: assembly.labelKey,
          },
        ] as const
    )
  ),
  ...UNREFERENCED_PARTS.map(
    (part) =>
      [
        part.key,
        {
          key: part.key,
          labelKey: part.labelKey,
          catalogName: null,
          assemblySlug: null,
          assemblyLabelKey: null,
        },
      ] as const
  ),
])

/** Clés persistables dans le panier de réparation. */
export const ALL_SPARE_PART_KEYS: ReadonlySet<string> = new Set(SPARE_PART_CATALOG_INDEX.keys())
