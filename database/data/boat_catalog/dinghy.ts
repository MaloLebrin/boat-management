import type { BoatBrandSeed } from '#shared/types/boat_catalog'

/**
 * Dériveurs et voile légère (#571).
 *
 * Règles de saisie (détail : `database/data/boat_catalog/README.md`) — `name` =
 * nom commercial officiel, jamais traduit ; `slug` kebab-case **stable à vie** ;
 * `aliases` = orthographes réellement rencontrées ; une marque est déclarée une
 * seule fois, ses modèles groupés par catégorie ; les années ne sont
 * renseignées que lorsqu'elles sont certaines.
 *
 * Cas particulier : plusieurs séries de la voile légère sont des **classes**
 * gérées par une association (Optimist, 420, 470, Finn…), pas des chantiers.
 * Elles sont modélisées comme des marques à part entière : c'est ainsi qu'un
 * propriétaire les désigne, et c'est ce qu'il tapera dans la combobox.
 */
export const DINGHY_BRANDS: readonly BoatBrandSeed[] = [
  {
    slug: 'optimist',
    name: 'Optimist',
    country: 'DK',
    categories: ['dinghy'],
    aliases: ['optimist', 'opti', 'Class Optimist'],
    models: {
      dinghy: ['Optimist', 'Optimist Race', 'Optimist School'],
    },
  },
  {
    slug: 'ilca',
    name: 'ILCA',
    country: 'GB',
    categories: ['dinghy'],
    aliases: ['ilca', 'laser', 'Laser Performance', 'ILCA Dinghy'],
    models: {
      dinghy: [
        'ILCA 4',
        'ILCA 6',
        'ILCA 7',
        'Laser Standard',
        'Laser Radial',
        'Laser 4.7',
        'Laser Pico',
        'Laser Bahia',
        'Laser Vago',
        'Laser 2000',
        'Laser Stratos',
      ],
    },
  },
  {
    slug: 'class-420',
    name: '420',
    country: 'FR',
    categories: ['dinghy'],
    aliases: ['420', 'four twenty', 'Class 420'],
    models: {
      dinghy: ['420', '420 Club', '420 Race'],
    },
  },
  {
    slug: 'class-470',
    name: '470',
    country: 'FR',
    categories: ['dinghy'],
    aliases: ['470', 'four seventy', 'Class 470'],
    models: {
      dinghy: ['470', '470 Mixed'],
    },
  },
  {
    slug: 'class-europe',
    name: 'Europe',
    country: 'BE',
    categories: ['dinghy'],
    aliases: ['europe', 'Europe Dinghy', 'Class Europe'],
    models: {
      dinghy: ['Europe'],
    },
  },
  {
    slug: 'class-finn',
    name: 'Finn',
    country: 'SE',
    categories: ['dinghy'],
    aliases: ['finn', 'Finn Dinghy', 'Class Finn'],
    models: {
      dinghy: ['Finn'],
    },
  },
  {
    slug: 'class-fireball',
    name: 'Fireball',
    country: 'GB',
    categories: ['dinghy'],
    aliases: ['fireball', 'Class Fireball'],
    models: {
      dinghy: ['Fireball'],
    },
  },
  {
    slug: 'vaurien',
    name: 'Vaurien',
    country: 'FR',
    categories: ['dinghy'],
    aliases: ['vaurien', 'Class Vaurien'],
    models: {
      dinghy: ['Vaurien', 'Vaurien Classique'],
    },
  },
  {
    slug: 'caravelle',
    name: 'Caravelle',
    country: 'FR',
    categories: ['dinghy'],
    aliases: ['caravelle', 'Caravelle Dériveur'],
    models: {
      dinghy: ['Caravelle', 'Caravelle Nouvelle'],
    },
  },
  {
    slug: 'class-505',
    name: '505',
    country: 'FR',
    categories: ['dinghy'],
    aliases: ['505', 'five o five', 'Class 505'],
    models: {
      dinghy: ['505'],
    },
  },
  {
    slug: 'rs-sailing',
    name: 'RS Sailing',
    country: 'GB',
    categories: ['dinghy'],
    aliases: ['rs sailing', 'rssailing', 'RS Racing'],
    models: {
      dinghy: [
        'RS Aero 5',
        'RS Aero 6',
        'RS Aero 7',
        'RS Aero 9',
        'RS Feva XL',
        'RS Tera Sport',
        'RS Tera Pro',
        'RS Quest',
        'RS Vision',
        'RS Venture Connect',
        'RS Zest',
        'RS 200',
        'RS 400',
        'RS 500',
        'RS 700',
        'RS 800',
        'RS Neo',
        'RS Toura',
      ],
    },
  },
  {
    slug: 'topper-sailboats',
    name: 'Topper',
    country: 'GB',
    categories: ['dinghy'],
    aliases: ['topper', 'Topper Sailboats', 'Topper International'],
    models: {
      dinghy: ['Topper', 'Topper Taz', 'Topper Topaz Uno', 'Topper Topaz Duo', 'Topper Xenon'],
    },
  },
  {
    slug: 'zoom8',
    name: 'Zoom8',
    country: 'FI',
    categories: ['dinghy'],
    aliases: ['zoom8', 'Zoom 8'],
    models: {
      dinghy: ['Zoom8'],
    },
  },
  {
    slug: 'hobie-cat',
    name: 'Hobie Cat',
    country: 'US',
    categories: ['dinghy', 'sailboat_multihull'],
    aliases: ['hobie', 'hobie cat', 'Hobie Cat Company'],
    models: {
      dinghy: [
        'Hobie Cat 14',
        'Hobie Cat 15',
        'Hobie Cat 16',
        'Hobie Cat 17',
        'Hobie Cat 18',
        'Hobie Cat Dragoon',
        'Hobie Cat Wave',
        'Hobie Cat Bravo',
        'Hobie Cat Getaway',
        'Hobie Cat Tiger',
        'Hobie Cat Tandem Island',
        'Hobie Cat Adventure Island',
      ],
    },
  },
  {
    slug: 'nacra-sailing',
    name: 'Nacra Sailing',
    country: 'NL',
    categories: ['dinghy', 'sailboat_multihull'],
    aliases: ['nacra', 'Nacra Sailing', 'Nacra Catamarans'],
    models: {
      dinghy: [
        'Nacra 15',
        'Nacra 17',
        'Nacra 400',
        'Nacra 460',
        'Nacra 500',
        'Nacra 570',
        'Nacra F16',
        'Nacra F18 Infusion',
        'Nacra F20 Carbon',
      ],
    },
  },
  {
    slug: 'melges',
    name: 'Melges',
    country: 'US',
    categories: ['dinghy', 'sailboat_monohull'],
    aliases: ['melges', 'Melges Performance Sailboats'],
    models: {
      dinghy: ['Melges 14', 'Melges 15', 'Melges 17', 'Melges MC Scow', 'Melges A Scow'],
      sailboat_monohull: ['Melges 20', 'Melges 24', 'Melges 32', 'Melges 40', 'Melges IC37'],
    },
  },
  {
    slug: 'ovington-boats',
    name: 'Ovington Boats',
    country: 'GB',
    categories: ['dinghy'],
    aliases: ['ovington', 'Ovington Boats'],
    models: {
      dinghy: [
        'Ovington 29er',
        'Ovington 49er',
        'Ovington 49erFX',
        'Ovington VX One',
        'Ovington B14',
      ],
    },
  },
  {
    slug: 'waszp',
    name: 'WASZP',
    country: 'AU',
    categories: ['dinghy'],
    aliases: ['waszp', 'Waszp', 'WASZP Foiling'],
    models: {
      dinghy: ['WASZP 6.9', 'WASZP 8.2', 'WASZP X'],
    },
  },
  {
    slug: 'devoti-sailing',
    name: 'Devoti Sailing',
    country: 'CZ',
    categories: ['dinghy'],
    aliases: ['devoti', 'Devoti Sailing'],
    models: {
      dinghy: ['Devoti Finn', 'Devoti D-One', 'Devoti D-Zero'],
    },
  },
  {
    slug: 'zim-sailing',
    name: 'Zim Sailing',
    country: 'US',
    categories: ['dinghy'],
    aliases: ['zim', 'Zim Sailing'],
    models: {
      dinghy: ['Zim 15', 'Zim Club 420', 'Zim Optimist', 'Zim Fleet Racing Dinghy'],
    },
  },
  {
    slug: 'mackay-boats',
    name: 'Mackay Boats',
    country: 'NZ',
    categories: ['dinghy'],
    aliases: ['mackay', 'Mackay Boats'],
    models: {
      dinghy: ['Mackay 470', 'Mackay 49er', 'Mackay Nacra 17'],
    },
  },
  {
    slug: 'class-snipe',
    name: 'Snipe',
    country: 'US',
    categories: ['dinghy'],
    aliases: ['snipe', 'Class Snipe'],
    models: {
      dinghy: ['Snipe'],
    },
  },
  {
    slug: 'class-moth',
    name: 'International Moth',
    country: 'AU',
    categories: ['dinghy'],
    aliases: ['moth', 'international moth', 'Class Moth'],
    models: {
      dinghy: ['International Moth', 'Moth Bieker', 'Moth Exocet', 'Moth Mach2'],
    },
  },
]
