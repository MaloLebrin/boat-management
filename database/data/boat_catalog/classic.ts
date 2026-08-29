import type { BoatBrandSeed } from '#shared/types/boat_catalog'

/**
 * Bateaux classiques et traditionnels (#571).
 *
 * Règles de saisie (détail : `database/data/boat_catalog/README.md`) — `name` =
 * nom commercial officiel, jamais traduit ; `slug` kebab-case **stable à vie** ;
 * `aliases` = orthographes réellement rencontrées ; une marque est déclarée une
 * seule fois, ses modèles groupés par catégorie ; les années ne sont
 * renseignées que lorsqu'elles sont certaines.
 *
 * Riva et Chris-Craft, dont la gamme classique est un pan de l'histoire du
 * chantier, sont déclarés avec leur marque dans `motor_yacht.ts`.
 */
export const CLASSIC_BRANDS: readonly BoatBrandSeed[] = [
  {
    slug: 'rhodes-yachts',
    name: 'Rhodes',
    country: 'US',
    categories: ['classic', 'sailboat_monohull'],
    aliases: ['rhodes', 'Philip Rhodes', 'Rhodes Yachts'],
    models: {
      classic: [
        'Rhodes 19',
        'Rhodes 22',
        'Rhodes Bounty II',
        'Rhodes Reliant 41',
        'Rhodes Vanguard',
        'Rhodes Meridian 25',
      ],
    },
  },
  {
    slug: 'herreshoff',
    name: 'Herreshoff',
    country: 'US',
    categories: ['classic', 'sailboat_monohull'],
    aliases: ['herreshoff', 'Herreshoff Manufacturing', 'Nathanael Herreshoff'],
    models: {
      classic: [
        'Herreshoff 12½',
        'Herreshoff Alerion',
        'Herreshoff Buzzards Bay 15',
        'Herreshoff Buzzards Bay 25',
        'Herreshoff Fish Class',
        'Herreshoff H-28',
        'Herreshoff Rozinante',
        'Herreshoff Marlin',
      ],
    },
  },
  {
    slug: 'cornish-crabbers',
    name: 'Cornish Crabbers',
    country: 'GB',
    categories: ['classic', 'sailboat_monohull'],
    aliases: ['cornish crabbers', 'cornishcrabbers', 'Crabber'],
    models: {
      classic: [
        'Cornish Crabber 17',
        'Cornish Crabber 19',
        'Cornish Crabber 22',
        'Cornish Crabber 24',
        'Cornish Crabber 26',
        'Cornish Shrimper 19',
        'Cornish Shrimper 21',
        'Cornish Pilot Cutter 30',
        'Cornish Cormorant',
      ],
    },
  },
  {
    slug: 'drascombe',
    name: 'Drascombe',
    country: 'GB',
    categories: ['classic', 'dinghy'],
    aliases: ['drascombe', 'Drascombe Boats', 'Honnor Marine Drascombe'],
    models: {
      classic: [
        'Drascombe Lugger',
        'Drascombe Longboat',
        'Drascombe Dabber',
        'Drascombe Coaster',
        'Drascombe Drifter',
        'Drascombe Scaffie',
        'Drascombe Peter Boat',
        'Drascombe Gig',
      ],
    },
  },
  {
    slug: 'chantier-du-guip',
    name: 'Chantier du Guip',
    country: 'FR',
    categories: ['classic', 'workboat'],
    aliases: ['chantier du guip', 'le guip', 'Chantier Le Guip'],
    models: {
      classic: [
        'Guip Misainier',
        'Guip Sloup Coquillier',
        'Guip Cotre Pilote',
        'Guip Chaloupe Sardinière',
      ],
    },
  },
  {
    slug: 'cornu',
    name: 'Cornu',
    country: 'FR',
    categories: ['classic', 'sailboat_monohull'],
    aliases: ['cornu', 'André Cornu', 'Chantier Cornu'],
    models: {
      classic: ['Cornu Sylphe', 'Cornu Belouga', 'Cornu Corsaire', 'Cornu Mousquetaire'],
    },
  },
  {
    slug: 'sparkman-stephens',
    name: 'Sparkman & Stephens',
    country: 'US',
    categories: ['classic', 'sailboat_monohull'],
    aliases: ['sparkman stephens', 'sparkman and stephens', 'S&S'],
    models: {
      classic: [
        'Sparkman & Stephens Dorade',
        'Sparkman & Stephens Finisterre',
        'Sparkman & Stephens Swan 43',
        'Sparkman & Stephens Nevins 40',
        'Sparkman & Stephens Loki Yawl',
      ],
    },
  },
  {
    slug: 'camper-nicholsons',
    name: 'Camper & Nicholsons',
    country: 'GB',
    categories: ['classic', 'sailboat_monohull'],
    aliases: ['camper nicholsons', 'camper and nicholsons', 'Nicholson'],
    models: {
      classic: [
        'Nicholson 26',
        'Nicholson 31',
        'Nicholson 32',
        'Nicholson 35',
        'Nicholson 38',
        'Nicholson 43',
        'Nicholson 55',
      ],
    },
  },
  {
    slug: 'william-fife',
    name: 'William Fife & Son',
    country: 'GB',
    categories: ['classic'],
    aliases: ['fife', 'william fife', 'Fife of Fairlie'],
    models: {
      classic: ['Fife Cambria', 'Fife Moonbeam IV', 'Fife Latifa', 'Fife Solway Maid', 'Fife 8mR'],
    },
  },
  {
    slug: 'latitude-46',
    name: 'Latitude 46',
    country: 'FR',
    categories: ['classic', 'sailboat_monohull'],
    aliases: ['latitude 46', 'tofinou', 'Chantier Tofinou'],
    models: {
      classic: ['Tofinou 7', 'Tofinou 8', 'Tofinou 9.5', 'Tofinou 10', 'Tofinou 12', 'Tofinou 16'],
    },
  },
  {
    slug: 'grand-largue-composites',
    name: 'Grand Largue Composites',
    country: 'FR',
    categories: ['classic', 'sailboat_monohull'],
    aliases: ['grand largue', 'Grand Largue Composites'],
    models: {
      classic: ['Bermudes 1160', 'Bermudes 1300', 'Sun Way 25'],
    },
  },
  {
    slug: 'hinckley-yachts',
    name: 'Hinckley Yachts',
    country: 'US',
    categories: ['classic', 'motor_yacht', 'sailboat_monohull'],
    aliases: ['hinckley', 'Hinckley Yachts', 'Hinckley Company'],
    models: {
      classic: ['Hinckley Bermuda 40', 'Hinckley Sou’wester 42', 'Hinckley Sou’wester 52'],
      motor_yacht: [
        'Hinckley Picnic Boat 34',
        'Hinckley Picnic Boat 37',
        'Hinckley Picnic Boat 40',
        'Hinckley Talaria 43',
        'Hinckley Talaria 48',
        'Hinckley Talaria 55',
      ],
    },
  },
]
