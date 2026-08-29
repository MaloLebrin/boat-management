import type { BoatBrandSeed } from '#shared/types/boat_catalog'

/**
 * Trawlers et vedettes hauturières (#571).
 *
 * Règles de saisie (détail : `database/data/boat_catalog/README.md`) — `name` =
 * nom commercial officiel, jamais traduit ; `slug` kebab-case **stable à vie** ;
 * `aliases` = orthographes réellement rencontrées ; une marque est déclarée une
 * seule fois, ses modèles groupés par catégorie ; les années ne sont
 * renseignées que lorsqu'elles sont certaines.
 *
 * Le Swift Trawler est une gamme Bénéteau : elle est déclarée avec la marque,
 * dans `sailboat_monohull.ts`. Linssen, à cheval sur le fluvial, est déclaré
 * dans `houseboat.ts`.
 */
export const TRAWLER_BRANDS: readonly BoatBrandSeed[] = [
  {
    slug: 'grand-banks',
    name: 'Grand Banks',
    country: 'US',
    categories: ['trawler', 'motor_yacht'],
    aliases: ['grand banks', 'grandbanks', 'Grand Banks Yachts'],
    models: {
      trawler: [
        'Grand Banks 32 Sedan',
        'Grand Banks 36 Classic',
        'Grand Banks 42 Classic',
        'Grand Banks 42 Europa',
        'Grand Banks 46 Classic',
        'Grand Banks 46 Europa',
        'Grand Banks 47 Heritage',
        'Grand Banks 49 Classic',
        'Grand Banks 52 Europa',
        'Grand Banks 54 Heritage',
        'Grand Banks 59 Aleutian',
        'Grand Banks 64 Aleutian',
      ],
      motor_yacht: [
        'Grand Banks 54',
        'Grand Banks 60',
        'Grand Banks 85',
        'Grand Banks GB60 Skylounge',
      ],
    },
  },
  {
    slug: 'nordhavn',
    name: 'Nordhavn',
    country: 'US',
    categories: ['trawler'],
    aliases: ['nordhavn', 'Pacific Asian Enterprises'],
    models: {
      trawler: [
        'Nordhavn 40',
        'Nordhavn 41',
        'Nordhavn 43',
        'Nordhavn 46',
        'Nordhavn 47',
        'Nordhavn 50',
        'Nordhavn 52',
        'Nordhavn 55',
        'Nordhavn 57',
        'Nordhavn 59 Coastal Pilot',
        'Nordhavn 60',
        'Nordhavn 62',
        'Nordhavn 63',
        'Nordhavn 64',
        'Nordhavn 68',
        'Nordhavn 72',
        'Nordhavn 76',
        'Nordhavn 80',
        'Nordhavn 86',
        'Nordhavn 96',
      ],
    },
  },
  {
    slug: 'fleming-yachts',
    name: 'Fleming Yachts',
    country: 'US',
    categories: ['trawler'],
    aliases: ['fleming', 'Fleming Yachts'],
    models: {
      trawler: ['Fleming 55', 'Fleming 58', 'Fleming 65', 'Fleming 78', 'Fleming 85', 'Fleming 53'],
    },
  },
  {
    slug: 'selene-yachts',
    name: 'Selene Yachts',
    country: 'CN',
    categories: ['trawler'],
    aliases: ['selene', 'Selene Yachts', 'Selene Trawlers'],
    models: {
      trawler: [
        'Selene 38',
        'Selene 42',
        'Selene 43',
        'Selene 45',
        'Selene 47',
        'Selene 50',
        'Selene 53',
        'Selene 55',
        'Selene 59',
        'Selene 60',
        'Selene 62',
        'Selene 66',
        'Selene 72',
        'Selene 78',
      ],
    },
  },
  {
    slug: 'kadey-krogen',
    name: 'Kadey-Krogen Yachts',
    country: 'US',
    categories: ['trawler'],
    aliases: ['kadey krogen', 'kadeykrogen', 'Krogen'],
    models: {
      trawler: [
        'Kadey-Krogen 39',
        'Kadey-Krogen 42',
        'Kadey-Krogen 44',
        'Kadey-Krogen 48',
        'Kadey-Krogen 50',
        'Kadey-Krogen 52',
        'Kadey-Krogen 55',
        'Kadey-Krogen 58',
        'Kadey-Krogen 60',
      ],
    },
  },
  {
    slug: 'trader-yachts',
    name: 'Trader Yachts',
    country: 'GB',
    categories: ['trawler', 'motor_yacht'],
    aliases: ['trader', 'Trader Yachts', 'Tarquin Trader'],
    models: {
      trawler: [
        'Trader 41 Signature',
        'Trader 44 Signature',
        'Trader 50 Signature',
        'Trader 53 Sunliner',
        'Trader 535 Signature',
        'Trader 575 Signature',
        'Trader 64 Sunliner',
        'Trader 65',
      ],
    },
  },
  {
    slug: 'vripack',
    name: 'Vripack',
    country: 'NL',
    categories: ['trawler', 'motor_yacht'],
    aliases: ['vripack', 'Vripack Yachting'],
    models: {
      trawler: ['Vripack Doggersbank 66', 'Vripack Doggersbank 75', 'Vripack Doggersbank 84'],
    },
  },
  {
    slug: 'american-tug',
    name: 'American Tug',
    country: 'US',
    categories: ['trawler'],
    aliases: ['american tug', 'americantug'],
    models: {
      trawler: ['American Tug 365', 'American Tug 395', 'American Tug 435', 'American Tug 485'],
    },
  },
  {
    slug: 'ranger-tugs',
    name: 'Ranger Tugs',
    country: 'US',
    categories: ['trawler'],
    aliases: ['ranger tugs', 'rangertugs'],
    models: {
      trawler: [
        'Ranger Tugs R-23',
        'Ranger Tugs R-25',
        'Ranger Tugs R-27',
        'Ranger Tugs R-29',
        'Ranger Tugs R-31',
        'Ranger Tugs R-41',
        'Ranger Tugs R-43',
      ],
    },
  },
  {
    slug: 'monte-fino',
    name: 'Monte Fino',
    country: 'TW',
    categories: ['trawler'],
    aliases: ['monte fino', 'montefino'],
    models: {
      trawler: ['Monte Fino 56', 'Monte Fino 62', 'Monte Fino 68', 'Monte Fino 76'],
    },
  },
  {
    slug: 'hardy-marine',
    name: 'Hardy Marine',
    country: 'GB',
    categories: ['trawler', 'fishing'],
    aliases: ['hardy', 'Hardy Marine'],
    models: {
      trawler: [
        'Hardy 36',
        'Hardy 42',
        'Hardy 50',
        'Hardy Commodore 42',
        'Hardy Seawings 32',
        'Hardy Fishing 24',
        'Hardy Fishing 27',
      ],
    },
  },
  {
    slug: 'seaward-nelson',
    name: 'Seaward',
    country: 'GB',
    categories: ['trawler', 'fishing'],
    aliases: ['seaward', 'Seaward Boats', 'Nelson Seaward'],
    models: {
      trawler: [
        'Seaward Nelson 29',
        'Seaward Nelson 34',
        'Seaward Nelson 38',
        'Seaward Nelson 42',
        'Seaward 23',
        'Seaward 25',
      ],
    },
  },
  {
    slug: 'nord-west',
    name: 'Nord West',
    country: 'SE',
    categories: ['trawler', 'motor_yacht'],
    aliases: ['nord west', 'nordwest', 'Nord West Yachts'],
    models: {
      trawler: [
        'Nord West 340',
        'Nord West 370',
        'Nord West 390',
        'Nord West 420',
        'Nord West 445',
        'Nord West 530',
      ],
    },
  },
  {
    slug: 'vicem-yachts',
    name: 'Vicem Yachts',
    country: 'TR',
    categories: ['trawler', 'motor_yacht', 'classic'],
    aliases: ['vicem', 'Vicem Yachts'],
    models: {
      trawler: ['Vicem 58 Classic', 'Vicem 65 Classic', 'Vicem 78 Classic', 'Vicem 107 Cruiser'],
    },
  },
]
