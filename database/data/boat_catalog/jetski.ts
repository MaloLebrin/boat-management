import type { BoatBrandSeed } from '#shared/types/boat_catalog'

/**
 * Jet-skis et véhicules nautiques à moteur (#571).
 *
 * Règles de saisie (détail : `database/data/boat_catalog/README.md`) — `name` =
 * nom commercial officiel, jamais traduit ; `slug` kebab-case **stable à vie** ;
 * `aliases` = orthographes réellement rencontrées ; une marque est déclarée une
 * seule fois, ses modèles groupés par catégorie ; les années ne sont
 * renseignées que lorsqu'elles sont certaines.
 */
export const JETSKI_BRANDS: readonly BoatBrandSeed[] = [
  {
    slug: 'sea-doo',
    name: 'Sea-Doo',
    country: 'CA',
    categories: ['jetski'],
    aliases: ['sea doo', 'seadoo', 'BRP Sea-Doo', 'Bombardier Sea-Doo'],
    models: {
      jetski: [
        'Sea-Doo Spark',
        'Sea-Doo Spark Trixx',
        'Sea-Doo GTI 90',
        'Sea-Doo GTI 130',
        'Sea-Doo GTI SE 130',
        'Sea-Doo GTI SE 170',
        'Sea-Doo GTR 230',
        'Sea-Doo GTX 170',
        'Sea-Doo GTX 230',
        'Sea-Doo GTX Limited 300',
        'Sea-Doo RXP-X 300',
        'Sea-Doo RXP-X 325',
        'Sea-Doo RXT-X 300',
        'Sea-Doo RXT-X 325',
        'Sea-Doo Wake 170',
        'Sea-Doo Wake Pro 230',
        'Sea-Doo Fish Pro Scout',
        'Sea-Doo Fish Pro Sport',
        'Sea-Doo Fish Pro Trophy',
        'Sea-Doo Explorer Pro 170',
        'Sea-Doo Switch 13',
        'Sea-Doo Switch Cruise 18',
        'Sea-Doo Switch Sport 21',
        'Sea-Doo GTS 130',
        'Sea-Doo XP',
        'Sea-Doo RXP 215',
      ],
    },
  },
  {
    slug: 'yamaha-waverunner',
    name: 'Yamaha WaveRunner',
    country: 'JP',
    categories: ['jetski'],
    aliases: ['yamaha', 'waverunner', 'Yamaha WaveRunner', 'Wave Runner'],
    models: {
      jetski: [
        'Yamaha EX',
        'Yamaha EX Sport',
        'Yamaha EX Deluxe',
        'Yamaha EX Limited',
        'Yamaha JetBlaster',
        'Yamaha VX',
        'Yamaha VX Deluxe',
        'Yamaha VX Cruiser',
        'Yamaha VX Limited',
        'Yamaha GP1800R HO',
        'Yamaha GP1800R SVHO',
        'Yamaha GP-HO',
        'Yamaha FX HO',
        'Yamaha FX Cruiser HO',
        'Yamaha FX SVHO',
        'Yamaha FX Cruiser SVHO',
        'Yamaha FX Limited SVHO',
        'Yamaha SuperJet',
        'Yamaha VXR',
        'Yamaha VXS',
      ],
    },
  },
  {
    slug: 'kawasaki-jet-ski',
    name: 'Kawasaki Jet Ski',
    country: 'JP',
    categories: ['jetski'],
    aliases: ['kawasaki', 'jet ski', 'Kawasaki Jet Ski'],
    models: {
      jetski: [
        'Kawasaki Jet Ski Ultra 160LX',
        'Kawasaki Jet Ski Ultra 160LX-S',
        'Kawasaki Jet Ski Ultra 310R',
        'Kawasaki Jet Ski Ultra 310LX',
        'Kawasaki Jet Ski Ultra 310X',
        'Kawasaki Jet Ski STX 160',
        'Kawasaki Jet Ski STX 160X',
        'Kawasaki Jet Ski STX 160LX',
        'Kawasaki Jet Ski STX-15F',
        'Kawasaki Jet Ski SX-R 160',
        'Kawasaki Jet Ski Ultra LX',
        'Kawasaki Jet Ski 800 SX-R',
      ],
    },
  },
  {
    slug: 'krash-industries',
    name: 'Krash Industries',
    country: 'AU',
    categories: ['jetski'],
    aliases: ['krash', 'Krash Industries'],
    models: {
      jetski: ['Krash Footrocket', 'Krash Reaper', 'Krash Hooligan', 'Krash Predator'],
    },
  },
  {
    slug: 'belassi',
    name: 'Belassi',
    country: 'AT',
    categories: ['jetski'],
    aliases: ['belassi', 'Belassi Burrasca'],
    models: {
      jetski: ['Belassi Burrasca B3R', 'Belassi Burrasca Sport'],
    },
  },
  {
    slug: 'taiga-motors',
    name: 'Taiga',
    country: 'CA',
    categories: ['jetski'],
    aliases: ['taiga', 'Taiga Motors'],
    models: {
      jetski: ['Taiga Orca Sport', 'Taiga Orca Performance', 'Taiga Orca Carbon'],
    },
  },
]
