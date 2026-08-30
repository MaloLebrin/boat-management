import type { EquipmentBrandSeed } from '#shared/types/equipment_catalog'

/**
 * Énergie et chauffage (#577) : éoliennes, hydrogénérateurs, chauffages.
 *
 * Les groupes électrogènes (Fischer Panda, Onan, Paguro…) ne sont **pas**
 * dupliqués ici : ils sont couverts par le catalogue moteur (#573, famille
 * `generator`) — un groupe se saisit comme un moteur dans l'app.
 *
 * Règles de saisie : `database/data/equipment_catalog/README.md`.
 */
export const ENERGY_BRANDS: readonly EquipmentBrandSeed[] = [
  {
    slug: 'watt-and-sea',
    name: 'Watt&Sea',
    country: 'FR',
    categories: ['energy'],
    aliases: ['watt & sea', 'watt and sea', 'wattsea'],
    models: {
      energy: [{ name: 'Cruising 300' }, { name: 'Cruising 600' }, { name: 'POD 600' }],
    },
  },
  {
    slug: 'silentwind',
    name: 'Silentwind',
    country: 'PT',
    categories: ['energy'],
    aliases: ['silent wind'],
    models: {
      energy: [{ name: 'Silentwind Pro 400' }],
    },
  },
  {
    slug: 'rutland',
    name: 'Rutland',
    country: 'GB',
    categories: ['energy'],
    aliases: ['marlec', 'marlec rutland'],
    models: {
      energy: [{ name: 'Rutland 914i' }, { name: 'Rutland 1200' }],
    },
  },
  {
    slug: 'superwind',
    name: 'Superwind',
    country: 'DE',
    categories: ['energy'],
    models: {
      energy: [{ name: 'SW 350' }, { name: 'SW 500' }],
    },
  },
  {
    slug: 'eclectic-energy',
    name: 'Eclectic Energy',
    country: 'GB',
    categories: ['energy'],
    aliases: ['duogen', 'd400'],
    models: {
      energy: [{ name: 'D400' }, { name: 'DuoGen-3' }],
    },
  },
  {
    slug: 'webasto',
    name: 'Webasto',
    country: 'DE',
    // Chauffages côté énergie, climatisation côté confort.
    categories: ['energy', 'comfort'],
    models: {
      energy: [
        { name: 'Air Top 2000 STC' },
        { name: 'Air Top EVO 40' },
        { name: 'Air Top EVO 55' },
        { name: 'Thermo Top C' },
      ],
    },
  },
  {
    slug: 'eberspacher',
    name: 'Eberspächer',
    country: 'DE',
    categories: ['energy'],
    aliases: ['eberspacher', 'espar'],
    models: {
      energy: [
        { name: 'Airtronic D2' },
        { name: 'Airtronic S2 D2L' },
        { name: 'Airtronic D4' },
        { name: 'Hydronic D5' },
      ],
    },
  },
  {
    slug: 'wallas',
    name: 'Wallas',
    country: 'FI',
    // Chauffages côté énergie, réchauds diesel côté confort.
    categories: ['energy', 'comfort'],
    models: {
      energy: [{ name: '22GB' }, { name: '30GB' }, { name: '40D' }],
      comfort: [{ name: '85DU' }],
    },
  },
  {
    slug: 'refleks',
    name: 'Refleks',
    country: 'DK',
    categories: ['energy'],
    models: {
      energy: [{ name: '66MK' }],
    },
  },
  {
    slug: 'dickinson',
    name: 'Dickinson',
    country: 'CA',
    categories: ['energy', 'comfort'],
    aliases: ['dickinson marine'],
    models: {
      energy: [{ name: 'Newport P9000' }],
    },
  },
  {
    slug: 'autoterm',
    name: 'Autoterm',
    country: 'RU',
    categories: ['energy'],
    aliases: ['planar'],
    models: {
      energy: [{ name: 'Air 2D' }, { name: 'Air 4D' }],
    },
  },
  {
    slug: 'propex',
    name: 'Propex',
    country: 'GB',
    categories: ['energy'],
    models: {
      energy: [{ name: 'HS2000' }, { name: 'HS2211' }],
    },
  },
]
