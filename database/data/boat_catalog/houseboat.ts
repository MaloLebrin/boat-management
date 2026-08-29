import type { BoatBrandSeed } from '#shared/types/boat_catalog'

/**
 * Péniches et bateaux fluviaux (#571).
 *
 * Règles de saisie (détail : `database/data/boat_catalog/README.md`) — `name` =
 * nom commercial officiel, jamais traduit ; `slug` kebab-case **stable à vie** ;
 * `aliases` = orthographes réellement rencontrées ; une marque est déclarée une
 * seule fois, ses modèles groupés par catégorie ; les années ne sont
 * renseignées que lorsqu'elles sont certaines.
 */
export const HOUSEBOAT_BRANDS: readonly BoatBrandSeed[] = [
  {
    slug: 'linssen-yachts',
    name: 'Linssen Yachts',
    country: 'NL',
    categories: ['houseboat', 'trawler'],
    aliases: ['linssen', 'Linssen Yachts', 'Linssen Grand Sturdy'],
    models: {
      houseboat: [
        'Linssen Grand Sturdy 25.0',
        'Linssen Grand Sturdy 30.0',
        'Linssen Grand Sturdy 34.9',
        'Linssen Grand Sturdy 35.0',
        'Linssen Grand Sturdy 40.0',
        'Linssen Grand Sturdy 45.0',
        'Linssen Grand Sturdy 450',
        'Linssen Grand Sturdy 500',
        'Linssen Grand Sturdy 590',
        'Linssen Yachts 40 SL',
        'Linssen Yachts 45 SL',
        'Linssen Classic Sturdy 32',
        'Linssen Classic Sturdy 35',
      ],
      trawler: ['Linssen Grand Sturdy 480 AC', 'Linssen Grand Sturdy 500 Variotop'],
    },
  },
  {
    slug: 'pedro-boat',
    name: 'Pedro Boat',
    country: 'NL',
    categories: ['houseboat', 'trawler'],
    aliases: ['pedro', 'pedro boat', 'Pédro'],
    models: {
      houseboat: [
        'Pedro Skiron 35',
        'Pedro Levanto 33',
        'Pedro Marin 30',
        'Pedro Solano 35',
        'Pedro Bora 33',
        'Pedro Donky 40',
      ],
    },
  },
  {
    slug: 'nicols-yacht',
    name: 'Nicols Yacht',
    country: 'FR',
    categories: ['houseboat'],
    aliases: ['nicols', 'Nicols Yacht', 'Nicols Bateaux'],
    models: {
      houseboat: [
        'Nicols Estivale Duo',
        'Nicols Estivale Quattro',
        'Nicols Estivale Octo',
        'Nicols Sixto Green',
        'Nicols Sixto Prestige',
        'Nicols Confort 900',
        'Nicols Confort 1100',
        'Nicols Confort 1350',
        'Nicols Quattro Fly',
        'Nicols Octo Fly',
        'Nicols Riviera 1120',
      ],
    },
  },
  {
    slug: 'delphia-yachts',
    name: 'Delphia Yachts',
    country: 'PL',
    categories: ['houseboat', 'sailboat_monohull'],
    aliases: ['delphia', 'Delphia Yachts'],
    models: {
      houseboat: [
        'Delphia Escape 1050',
        'Delphia Escape 1150',
        'Delphia Escape 1350',
        'Delphia Nano',
        'Delphia Bravo 34',
      ],
      sailboat_monohull: [
        'Delphia 24',
        'Delphia 26',
        'Delphia 29',
        'Delphia 31',
        'Delphia 33',
        'Delphia 37',
        'Delphia 40',
        'Delphia 47',
      ],
    },
  },
  {
    slug: 'aquanaut',
    name: 'Aquanaut',
    country: 'NL',
    categories: ['houseboat', 'trawler'],
    aliases: ['aquanaut', 'Aquanaut Yachting'],
    models: {
      houseboat: [
        'Aquanaut Drifter 1150',
        'Aquanaut Drifter 1250',
        'Aquanaut Drifter 1500',
        'Aquanaut Andante 438',
        'Aquanaut Privilege 1250',
        'Aquanaut Privilege 1350',
        'Aquanaut Unico 1300',
      ],
    },
  },
  {
    slug: 'antaris-boats',
    name: 'Antaris',
    country: 'NL',
    categories: ['houseboat', 'classic'],
    aliases: ['antaris', 'Antaris Boats'],
    models: {
      houseboat: [
        'Antaris Sixty5',
        'Antaris Sixty6',
        'Antaris Sixty7',
        'Antaris Fifty5',
        'Antaris Seventy7',
        'Antaris Cabrio 800',
      ],
    },
  },
  {
    slug: 'piper-boats',
    name: 'Piper Boats',
    country: 'GB',
    categories: ['houseboat'],
    aliases: ['piper', 'Piper Boats', 'Piper Narrowboats'],
    models: {
      houseboat: [
        'Piper 45N Narrowboat',
        'Piper 50N Narrowboat',
        'Piper 55N Narrowboat',
        'Piper 60N Narrowboat',
        'Piper Dutch Barge 47',
        'Piper Dutch Barge 55',
      ],
    },
  },
  {
    slug: 'vacance-boats',
    name: 'Vacance',
    country: 'NL',
    categories: ['houseboat'],
    aliases: ['vacance', 'Vacance Boats', 'Vacance Yachting'],
    models: {
      houseboat: [
        'Vacance 1100',
        'Vacance 1200',
        'Vacance 1300',
        'Vacance 1350 Fly',
        'Vacance 1500',
      ],
    },
  },
  {
    slug: 'curtevenne',
    name: 'Curtevenne',
    country: 'NL',
    categories: ['houseboat'],
    aliases: ['curtevenne', 'Curtevenne Kruiser'],
    models: {
      houseboat: [
        'Curtevenne 1000',
        'Curtevenne 1100',
        'Curtevenne 1200',
        'Curtevenne 1300 Kruiser',
      ],
    },
  },
  {
    slug: 'freeman-cruisers',
    name: 'Freeman',
    country: 'GB',
    categories: ['houseboat', 'classic'],
    aliases: ['freeman', 'Freeman Cruisers', 'Freeman Marine'],
    models: {
      houseboat: [
        'Freeman 22',
        'Freeman 23',
        'Freeman 26',
        'Freeman 27',
        'Freeman 30',
        'Freeman 32',
        'Freeman 33 Mark II',
      ],
    },
  },
  {
    slug: 'sedan-boats',
    name: 'Sedan',
    country: 'FR',
    categories: ['houseboat'],
    aliases: ['sedan', 'Sedan Bateaux'],
    models: {
      houseboat: ['Sedan 950', 'Sedan 1010', 'Sedan 1100', 'Sedan 1200'],
    },
  },
  {
    slug: 'le-boat-penichette',
    name: 'Pénichette',
    country: 'FR',
    categories: ['houseboat'],
    aliases: ['penichette', 'Penichette', 'Locaboat Pénichette'],
    models: {
      houseboat: [
        'Pénichette 935',
        'Pénichette 1020',
        'Pénichette 1106',
        'Pénichette 1120',
        'Pénichette 1165',
        'Pénichette 1400',
        'Pénichette Flying Bridge 1180',
        'Pénichette Flying Bridge 1500',
      ],
    },
  },
  {
    slug: 'sheerline',
    name: 'Sheerline',
    country: 'GB',
    categories: ['houseboat'],
    aliases: ['sheerline', 'Sheerline Boats'],
    models: {
      houseboat: ['Sheerline 950', 'Sheerline 1050', 'Sheerline 1070', 'Sheerline 1150'],
    },
  },
  {
    slug: 'haines-marine',
    name: 'Haines Marine',
    country: 'GB',
    categories: ['houseboat'],
    aliases: ['haines', 'Haines Marine', 'Haines Boats'],
    models: {
      houseboat: [
        'Haines 32 Sedan',
        'Haines 360 Aft Cabin',
        'Haines 400 Aft Cabin',
        'Haines 32 Offshore',
        'Haines 26 Sedan',
      ],
    },
  },
]
