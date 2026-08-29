import type { BoatBrandSeed } from '#shared/types/boat_catalog'

/**
 * Catamarans à moteur (#571).
 *
 * Règles de saisie (détail : `database/data/boat_catalog/README.md`) — `name` =
 * nom commercial officiel, jamais traduit ; `slug` kebab-case **stable à vie** ;
 * `aliases` = orthographes réellement rencontrées ; une marque est déclarée une
 * seule fois, ses modèles groupés par catégorie ; les années ne sont
 * renseignées que lorsqu'elles sont certaines.
 *
 * Les chantiers qui déclinent leur gamme voile en moteur (Fountaine Pajot,
 * Lagoon, Leopard, Nautitech, Sunreef, Bali) sont déclarés dans
 * `sailboat_multihull.ts` avec l'ensemble de leurs gammes.
 */
export const POWER_CATAMARAN_BRANDS: readonly BoatBrandSeed[] = [
  {
    slug: 'aquila-power-catamarans',
    name: 'Aquila Power Catamarans',
    country: 'US',
    categories: ['power_catamaran'],
    aliases: ['aquila', 'Aquila Power Catamarans', 'Sino Eagle Aquila'],
    models: {
      power_catamaran: [
        'Aquila 28 Molokai',
        'Aquila 32 Sport',
        'Aquila 36 Sport',
        'Aquila 42 Yacht',
        'Aquila 44 Yacht',
        'Aquila 46 Yacht',
        'Aquila 47 Molokai',
        'Aquila 50 Yacht',
        'Aquila 54 Yacht',
        'Aquila 70 Luxury',
      ],
    },
  },
  {
    slug: 'horizon-power-catamarans',
    name: 'Horizon Power Catamarans',
    country: 'TW',
    categories: ['power_catamaran'],
    aliases: ['horizon power catamarans', 'Horizon PC'],
    models: {
      power_catamaran: ['Horizon PC52', 'Horizon PC60', 'Horizon PC68', 'Horizon PC74'],
    },
  },
  {
    slug: 'arrowcat',
    name: 'ArrowCat',
    country: 'US',
    categories: ['power_catamaran'],
    aliases: ['arrowcat', 'Arrow Cat'],
    models: {
      power_catamaran: ['ArrowCat 320', 'ArrowCat 380', 'ArrowCat 420'],
    },
  },
  {
    slug: 'silent-yachts',
    name: 'Silent Yachts',
    country: 'AT',
    categories: ['power_catamaran'],
    aliases: ['silent yachts', 'silentyachts', 'Silent-Yachts'],
    models: {
      power_catamaran: [
        'Silent 55',
        'Silent 60',
        'Silent 62',
        'Silent 64',
        'Silent 80',
        'Silent 120',
      ],
    },
  },
  {
    slug: 'alva-yachts',
    name: 'Alva Yachts',
    country: 'DE',
    categories: ['power_catamaran'],
    aliases: ['alva', 'Alva Yachts'],
    models: {
      power_catamaran: ['Alva Ocean Eco 60', 'Alva Ocean Eco 78', 'Alva Ocean Eco 90'],
    },
  },
  {
    slug: 'mcconaghy-boats',
    name: 'McConaghy Boats',
    country: 'CN',
    categories: ['power_catamaran', 'sailboat_multihull'],
    aliases: ['mcconaghy', 'McConaghy Boats'],
    models: {
      power_catamaran: ['McConaghy MC75P', 'McConaghy MC83P'],
      sailboat_multihull: ['McConaghy MC49', 'McConaghy MC52', 'McConaghy MC63', 'McConaghy MC68'],
    },
  },
  {
    slug: 'iliad-catamarans',
    name: 'Iliad Catamarans',
    country: 'AU',
    categories: ['power_catamaran'],
    aliases: ['iliad', 'Iliad Catamarans'],
    models: {
      power_catamaran: ['Iliad 50', 'Iliad 53', 'Iliad 62', 'Iliad 70', 'Iliad 80'],
    },
  },
  {
    slug: 'stealth-catamarans',
    name: 'Stealth Catamarans',
    country: 'ZA',
    categories: ['power_catamaran'],
    aliases: ['stealth', 'Stealth Catamarans'],
    models: {
      power_catamaran: ['Stealth 40', 'Stealth 50', 'Stealth 52'],
    },
  },
  {
    slug: 'world-cat',
    name: 'World Cat',
    country: 'US',
    categories: ['power_catamaran', 'fishing'],
    aliases: ['world cat', 'worldcat', 'World Cat Boats'],
    models: {
      power_catamaran: [
        'World Cat 230 CC',
        'World Cat 260 CC',
        'World Cat 280 CC',
        'World Cat 320 CC',
        'World Cat 400 CC-X',
        'World Cat 280 DC',
        'World Cat 325 DC',
      ],
    },
  },
]
