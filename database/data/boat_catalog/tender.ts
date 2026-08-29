import type { BoatBrandSeed } from '#shared/types/boat_catalog'

/**
 * Annexes (#571).
 *
 * Règles de saisie (détail : `database/data/boat_catalog/README.md`) — `name` =
 * nom commercial officiel, jamais traduit ; `slug` kebab-case **stable à vie** ;
 * `aliases` = orthographes réellement rencontrées ; une marque est déclarée une
 * seule fois, ses modèles groupés par catégorie ; les années ne sont
 * renseignées que lorsqu'elles sont certaines.
 *
 * La plupart des fabricants d'annexes font aussi du semi-rigide : ils sont
 * alors déclarés dans `rib.ts` (Zodiac, Highfield, 3D Tender, Williams, AB,
 * Walker Bay, Honwave…), avec leurs gammes `tender`.
 */
export const TENDER_BRANDS: readonly BoatBrandSeed[] = [
  {
    slug: 'castoldi',
    name: 'Castoldi',
    country: 'IT',
    categories: ['tender'],
    aliases: ['castoldi', 'Castoldi Jet'],
    models: {
      tender: [
        'Castoldi Jet 15',
        'Castoldi Jet 17',
        'Castoldi Jet 18',
        'Castoldi Jet 21',
        'Castoldi Jet Tender 400',
        'Castoldi Jet Tender 480',
      ],
    },
  },
  {
    slug: 'novurania',
    name: 'Novurania',
    country: 'IT',
    categories: ['tender', 'rib'],
    aliases: ['novurania', 'Novurania Tenders'],
    models: {
      tender: [
        'Novurania Chase 24',
        'Novurania Chase 30',
        'Novurania Catamaran 24',
        'Novurania Launch 22',
        'Novurania Deluxe 400',
        'Novurania Deluxe 460',
        'Novurania Equator 600',
      ],
    },
  },
  {
    slug: 'pascoe-international',
    name: 'Pascoe International',
    country: 'GB',
    categories: ['tender'],
    aliases: ['pascoe', 'Pascoe International'],
    models: {
      tender: [
        'Pascoe SL Limousine 7.5',
        'Pascoe SL Limousine 9.5',
        'Pascoe SY Open 6.5',
        'Pascoe SY Open 8.0',
        'Pascoe Beachlander 6.0',
      ],
    },
  },
  {
    slug: 'hyde-tenders',
    name: 'Hyde Tenders',
    country: 'GB',
    categories: ['tender'],
    aliases: ['hyde', 'Hyde Tenders', 'Hyde Sails Tenders'],
    models: {
      tender: ['Hyde Tender 3.2', 'Hyde Tender 3.8', 'Hyde Tender 4.5'],
    },
  },
  {
    slug: 'plastimo',
    name: 'Plastimo',
    country: 'FR',
    categories: ['tender'],
    aliases: ['plastimo', 'Plastimo Annexe'],
    models: {
      tender: [
        'Plastimo Raid P180',
        'Plastimo Raid P200',
        'Plastimo Raid P240',
        'Plastimo Fun P200',
        'Plastimo Fun P240',
        'Plastimo Yacht P270',
        'Plastimo Yacht P310',
      ],
    },
  },
  {
    slug: 'takacat',
    name: 'Takacat',
    country: 'NZ',
    categories: ['tender'],
    aliases: ['takacat', 'Taka Cat'],
    models: {
      tender: ['Takacat 260 LX', 'Takacat 300 LX', 'Takacat 340 LX', 'Takacat 380 LX'],
    },
  },
  {
    slug: 'nautiraid',
    name: 'Nautiraid',
    country: 'FR',
    categories: ['tender'],
    aliases: ['nautiraid', 'Nautiraid Annexe'],
    models: {
      tender: ['Nautiraid Coracle 250', 'Nautiraid Coracle 285', 'Nautiraid Grand Raid 500'],
    },
  },
  {
    slug: 'whaly-boats',
    name: 'Whaly Boats',
    country: 'NL',
    categories: ['tender', 'workboat'],
    aliases: ['whaly', 'Whaly Boats'],
    models: {
      tender: ['Whaly 210', 'Whaly 270', 'Whaly 310', 'Whaly 370', 'Whaly 400', 'Whaly 435'],
      workboat: ['Whaly 455', 'Whaly 500 Rescue'],
    },
  },
  {
    slug: 'pioner-boats',
    name: 'Pioner',
    country: 'NO',
    categories: ['tender', 'open_dayboat'],
    aliases: ['pioner', 'Pioner Boats'],
    models: {
      tender: ['Pioner 8', 'Pioner 10', 'Pioner 11', 'Pioner 12', 'Pioner 13'],
      open_dayboat: ['Pioner 14 Active', 'Pioner 15 Active', 'Pioner 17 Explorer'],
    },
  },
  {
    slug: 'portland-pudgy',
    name: 'Portland Pudgy',
    country: 'US',
    categories: ['tender'],
    aliases: ['portland pudgy', 'portlandpudgy'],
    models: {
      tender: ['Portland Pudgy'],
    },
  },
]
