import type { BoatBrandSeed } from '#shared/types/boat_catalog'

/**
 * Navires de servitude et bateaux professionnels (#571).
 *
 * Règles de saisie (détail : `database/data/boat_catalog/README.md`) — `name` =
 * nom commercial officiel, jamais traduit ; `slug` kebab-case **stable à vie** ;
 * `aliases` = orthographes réellement rencontrées ; une marque est déclarée une
 * seule fois, ses modèles groupés par catégorie ; les années ne sont
 * renseignées que lorsqu'elles sont certaines.
 *
 * Ribcraft et Novamarine, dont la gamme professionnelle prolonge le
 * semi-rigide, sont déclarés dans `rib.ts`.
 */
export const WORKBOAT_BRANDS: readonly BoatBrandSeed[] = [
  {
    slug: 'damen-shipyards',
    name: 'Damen Shipyards',
    country: 'NL',
    categories: ['workboat'],
    aliases: ['damen', 'Damen Shipyards', 'Damen Group'],
    models: {
      workboat: [
        'Damen Stan Tug 1205',
        'Damen Stan Tug 1606',
        'Damen Stan Tug 1907',
        'Damen Stan Patrol 1605',
        'Damen Stan Patrol 2005',
        'Damen Multi Cat 1908',
        'Damen Multi Cat 2712',
        'Damen Shoalbuster 2308',
        'Damen Shoalbuster 2711',
        'Damen ASD Tug 2312',
        'Damen Fast Crew Supplier 2610',
      ],
    },
  },
  {
    slug: 'astilleros-gondan',
    name: 'Astilleros Gondán',
    country: 'ES',
    categories: ['workboat'],
    aliases: ['gondan', 'Astilleros Gondán'],
    models: {
      workboat: ['Gondán Pilot Boat 21', 'Gondán SOV', 'Gondán Tug 32'],
    },
  },
  {
    slug: 'ocea',
    name: 'OCEA',
    country: 'FR',
    categories: ['workboat', 'motor_yacht'],
    aliases: ['ocea', 'OCEA Shipyard'],
    models: {
      workboat: ['OCEA FPB 72', 'OCEA FPB 98', 'OCEA OSV 190', 'OCEA Commuter 108'],
    },
  },
  {
    slug: 'sillinger',
    name: 'Sillinger',
    country: 'FR',
    categories: ['workboat', 'rib'],
    aliases: ['sillinger', 'Sillinger Pro'],
    models: {
      workboat: [
        'Sillinger 550 Pro',
        'Sillinger 650 Pro',
        'Sillinger 750 Pro',
        'Sillinger 900 Pro',
        'Sillinger 1200 Pro',
      ],
    },
  },
  {
    slug: 'tuco-marine',
    name: 'Tuco Marine',
    country: 'DK',
    categories: ['workboat'],
    aliases: ['tuco', 'Tuco Marine', 'ProZero'],
    models: {
      workboat: [
        'Tuco ProZero 10m Daughter Craft',
        'Tuco ProZero 12m Work Boat',
        'Tuco ProZero 15m Crew Transfer',
      ],
    },
  },
  {
    slug: 'safehaven-marine',
    name: 'Safehaven Marine',
    country: 'IE',
    categories: ['workboat'],
    aliases: ['safehaven', 'Safehaven Marine'],
    models: {
      workboat: [
        'Safehaven Interceptor 38',
        'Safehaven Interceptor 42',
        'Safehaven Interceptor 48',
        'Safehaven Wildcat 53',
        'Safehaven Barracuda',
      ],
    },
  },
  {
    slug: 'rodman-pro',
    name: 'Rodman Pro',
    country: 'ES',
    categories: ['workboat'],
    aliases: ['rodman pro', 'Rodman Professional'],
    models: {
      workboat: ['Rodman 55 Patrol', 'Rodman 66 Patrol', 'Rodman 890 Pro', 'Rodman 1250 Pro'],
    },
  },
  {
    slug: 'baltic-workboats',
    name: 'Baltic Workboats',
    country: 'EE',
    categories: ['workboat'],
    aliases: ['baltic workboats', 'balticworkboats'],
    models: {
      workboat: [
        'Baltic Workboats Pilot 1500',
        'Baltic Workboats Patrol 2100',
        'Baltic Workboats CTV 2400',
        'Baltic Workboats WP 1900',
      ],
    },
  },
]
