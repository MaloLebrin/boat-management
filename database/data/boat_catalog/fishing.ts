import type { BoatBrandSeed } from '#shared/types/boat_catalog'

/**
 * Pêche-promenade (#571).
 *
 * Règles de saisie (détail : `database/data/boat_catalog/README.md`) — `name` =
 * nom commercial officiel, jamais traduit ; `slug` kebab-case **stable à vie** ;
 * `aliases` = orthographes réellement rencontrées ; une marque est déclarée une
 * seule fois, ses modèles groupés par catégorie ; les années ne sont
 * renseignées que lorsqu'elles sont certaines.
 *
 * Les Merry Fisher (Jeanneau) et les grands constructeurs américains de
 * center-console (Boston Whaler, Grady-White, Robalo…) sont déclarés avec leur
 * marque, dans `sailboat_monohull.ts` et `motor_yacht.ts`.
 */
export const FISHING_BRANDS: readonly BoatBrandSeed[] = [
  {
    slug: 'arvor',
    name: 'Arvor',
    country: 'FR',
    categories: ['fishing'],
    aliases: ['arvor', 'Arvor Boats', 'Brunswick Arvor'],
    models: {
      fishing: [
        'Arvor 215 AS',
        'Arvor 230 AS',
        'Arvor 250 AS',
        'Arvor 280 AS',
        'Arvor 605 Sportsfish',
        'Arvor 730 Sportsfish',
        'Arvor 810 Sportsfish',
        'Arvor 20',
        'Arvor 21',
        'Arvor 231',
      ],
    },
  },
  {
    slug: 'kelt-marine',
    name: 'Kelt',
    country: 'FR',
    categories: ['fishing', 'open_dayboat'],
    aliases: ['kelt', 'Kelt Marine'],
    models: {
      fishing: ['Kelt 605 Fisher', 'Kelt 705 Fisher', 'Kelt White Shark 226'],
    },
  },
  {
    slug: 'orkney-boats',
    name: 'Orkney Boats',
    country: 'GB',
    categories: ['fishing'],
    aliases: ['orkney', 'Orkney Boats'],
    models: {
      fishing: [
        'Orkney Longliner 16',
        'Orkney Fastliner 19',
        'Orkney Fastliner 21',
        'Orkney Pilothouse 20',
        'Orkney Vanguard 190',
        'Orkney Day Angler 19',
      ],
    },
  },
  {
    slug: 'warrior-boats',
    name: 'Warrior Boats',
    country: 'GB',
    categories: ['fishing'],
    aliases: ['warrior', 'Warrior Boats'],
    models: {
      fishing: ['Warrior 165', 'Warrior 175', 'Warrior 195', 'Warrior 21', 'Warrior 245'],
    },
  },
  {
    slug: 'nordkapp-boats',
    name: 'Nordkapp',
    country: 'NO',
    categories: ['fishing', 'open_dayboat'],
    aliases: ['nordkapp', 'Nordkapp Boats'],
    models: {
      fishing: [
        'Nordkapp Enduro 605',
        'Nordkapp Enduro 705',
        'Nordkapp Enduro 805',
        'Nordkapp Coupe 830',
        'Nordkapp Avant 605',
        'Nordkapp Avant 705',
        'Nordkapp Noblesse 720',
      ],
    },
  },
  {
    slug: 'sting-boats',
    name: 'Sting',
    country: 'NO',
    categories: ['fishing', 'open_dayboat'],
    aliases: ['sting', 'Sting Boats'],
    models: {
      fishing: ['Sting 485 DC', 'Sting 530 DC', 'Sting 610 DC', 'Sting 610 Sport'],
    },
  },
  {
    slug: 'ockelbo-boats',
    name: 'Ockelbo',
    country: 'SE',
    categories: ['fishing', 'open_dayboat'],
    aliases: ['ockelbo', 'Ockelbo Boats'],
    models: {
      fishing: ['Ockelbo B17', 'Ockelbo B20', 'Ockelbo B21', 'Ockelbo C21', 'Ockelbo C24'],
    },
  },
  {
    slug: 'anytec',
    name: 'Anytec',
    country: 'SE',
    categories: ['fishing', 'open_dayboat'],
    aliases: ['anytec', 'Anytec Boats'],
    models: {
      fishing: ['Anytec 622 SP', 'Anytec 747 SPD', 'Anytec 750 SPD', 'Anytec 868 SPD'],
    },
  },
  {
    slug: 'sea-fox',
    name: 'Sea Fox',
    country: 'US',
    categories: ['fishing'],
    aliases: ['sea fox', 'seafox', 'Sea Fox Boats'],
    models: {
      fishing: [
        'Sea Fox 186 Commander',
        'Sea Fox 206 Commander',
        'Sea Fox 226 Commander',
        'Sea Fox 248 Commander',
        'Sea Fox 268 Commander',
        'Sea Fox 288 Commander',
        'Sea Fox 328 Commander',
        'Sea Fox 368 Commander',
        'Sea Fox 226 Traveler',
        'Sea Fox 256 Traveler',
      ],
    },
  },
  {
    slug: 'sailfish-boats',
    name: 'Sailfish Boats',
    country: 'US',
    categories: ['fishing'],
    aliases: ['sailfish', 'Sailfish Boats'],
    models: {
      fishing: [
        'Sailfish 220 CC',
        'Sailfish 242 CC',
        'Sailfish 246 CC',
        'Sailfish 272 CC',
        'Sailfish 276 DC',
        'Sailfish 290 CC',
        'Sailfish 316 DC',
        'Sailfish 360 CC',
      ],
    },
  },
  {
    slug: 'regulator-marine',
    name: 'Regulator Marine',
    country: 'US',
    categories: ['fishing'],
    aliases: ['regulator', 'Regulator Marine'],
    models: {
      fishing: [
        'Regulator 23',
        'Regulator 25',
        'Regulator 26XO',
        'Regulator 28',
        'Regulator 31',
        'Regulator 34',
        'Regulator 37',
        'Regulator 41',
      ],
    },
  },
  {
    slug: 'yellowfin-yachts',
    name: 'Yellowfin Yachts',
    country: 'US',
    categories: ['fishing'],
    aliases: ['yellowfin', 'Yellowfin Yachts'],
    models: {
      fishing: [
        'Yellowfin 24 Bay',
        'Yellowfin 26 Hybrid',
        'Yellowfin 32 CC',
        'Yellowfin 34 Offshore',
        'Yellowfin 36 Offshore',
        'Yellowfin 39 Offshore',
        'Yellowfin 42 Offshore',
        'Yellowfin 54 Offshore',
      ],
    },
  },
  {
    slug: 'invincible-boats',
    name: 'Invincible Boats',
    country: 'US',
    categories: ['fishing'],
    aliases: ['invincible', 'Invincible Boats'],
    models: {
      fishing: [
        'Invincible 33 Open Fisherman',
        'Invincible 35 Catamaran',
        'Invincible 36 Open Fisherman',
        'Invincible 37 Catamaran',
        'Invincible 40 Open Fisherman',
        'Invincible 46 Open Fisherman',
      ],
    },
  },
  {
    slug: 'freeman-boatworks',
    name: 'Freeman Boatworks',
    country: 'US',
    categories: ['fishing', 'power_catamaran'],
    aliases: ['freeman boatworks', 'Freeman Cats'],
    models: {
      fishing: ['Freeman 33', 'Freeman 34', 'Freeman 37', 'Freeman 42', 'Freeman 47'],
    },
  },
  {
    slug: 'alumacraft',
    name: 'Alumacraft',
    country: 'US',
    categories: ['fishing'],
    aliases: ['alumacraft', 'Alumacraft Boats'],
    models: {
      fishing: [
        'Alumacraft Competitor 165',
        'Alumacraft Competitor 175',
        'Alumacraft Competitor 185',
        'Alumacraft Classic 165',
        'Alumacraft Trophy 175',
        'Alumacraft Trophy 195',
        'Alumacraft Voyageur 175',
      ],
    },
  },
  {
    slug: 'lund-boats',
    name: 'Lund Boats',
    country: 'US',
    categories: ['fishing'],
    aliases: ['lund', 'Lund Boats'],
    models: {
      fishing: [
        'Lund Alaskan 1600',
        'Lund Alaskan 1800',
        'Lund Fury 1600',
        'Lund Impact 1875',
        'Lund Pro-V 1875',
        'Lund Pro-V 2075',
        'Lund Rebel 1650',
        'Lund Tyee 1975',
        'Lund Baron 2075',
      ],
    },
  },
  {
    slug: 'ranger-boats',
    name: 'Ranger Boats',
    country: 'US',
    categories: ['fishing'],
    aliases: ['ranger boats', 'Ranger Bass Boats'],
    models: {
      fishing: [
        'Ranger Z175',
        'Ranger Z185',
        'Ranger Z518',
        'Ranger Z520R',
        'Ranger Z521R',
        'Ranger VS1682',
        'Ranger RT178',
        'Ranger 2360 Bay',
      ],
    },
  },
  {
    slug: 'cobia-boats',
    name: 'Cobia Boats',
    country: 'US',
    categories: ['fishing'],
    aliases: ['cobia', 'Cobia Boats'],
    models: {
      fishing: [
        'Cobia 220 CC',
        'Cobia 240 CC',
        'Cobia 262 CC',
        'Cobia 280 CC',
        'Cobia 301 CC',
        'Cobia 320 CC',
        'Cobia 350 CC',
        'Cobia 240 DC',
        'Cobia 280 DC',
      ],
    },
  },
]
