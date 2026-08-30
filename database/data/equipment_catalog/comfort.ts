import type { EquipmentBrandSeed } from '#shared/types/equipment_catalog'

/**
 * Confort et vie à bord (#577) : froid, cuisson, dessalinisateurs,
 * accessoires.
 *
 * Règles de saisie : `database/data/equipment_catalog/README.md`.
 */
export const COMFORT_BRANDS: readonly EquipmentBrandSeed[] = [
  {
    slug: 'dometic',
    name: 'Dometic',
    country: 'SE',
    // Waeco a été absorbé par Dometic — c'est le nom qui reste écrit sur la
    // façade de bien des frigos à bord.
    categories: ['comfort'],
    aliases: ['waeco', 'dometic waeco'],
    models: {
      comfort: [
        { name: 'CFX3 35' },
        { name: 'CFX3 45' },
        { name: 'CFX3 55IM' },
        { name: 'CRX 50' },
        { name: 'CRX 65' },
        { name: 'CRX 80' },
      ],
    },
  },
  {
    slug: 'vitrifrigo',
    name: 'Vitrifrigo',
    country: 'IT',
    categories: ['comfort'],
    models: {
      comfort: [
        { name: 'C51i' },
        { name: 'C62i' },
        { name: 'C85i' },
        { name: 'C115i' },
        { name: 'DW180' },
      ],
    },
  },
  {
    slug: 'isotherm',
    name: 'Isotherm',
    country: 'IT',
    categories: ['comfort'],
    aliases: ['indel', 'indel webasto', 'indel b'],
    models: {
      comfort: [
        { name: 'Cruise 42' },
        { name: 'Cruise 49' },
        { name: 'Cruise 65' },
        { name: 'Cruise 85' },
        { name: 'Cruise 130' },
      ],
    },
  },
  {
    slug: 'engel',
    name: 'Engel',
    country: 'JP',
    categories: ['comfort'],
    models: {
      comfort: [{ name: 'MT35' }, { name: 'MT45' }],
    },
  },
  {
    slug: 'frigoboat',
    name: 'Frigoboat',
    country: 'IT',
    categories: ['comfort'],
  },
  {
    slug: 'eno',
    name: 'Eno',
    country: 'FR',
    categories: ['comfort'],
    models: {
      comfort: [{ name: 'Open Sea' }, { name: 'Gascogne 2' }, { name: 'Grand Large' }],
    },
  },
  {
    slug: 'techimpex',
    name: 'Techimpex',
    country: 'IT',
    categories: ['comfort'],
  },
  {
    slug: 'force-10',
    name: 'Force 10',
    country: 'CA',
    categories: ['comfort'],
    aliases: ['force ten'],
  },
  {
    slug: 'osculati',
    name: 'Osculati',
    country: 'IT',
    categories: ['comfort', 'deck'],
  },
  {
    slug: 'katadyn',
    name: 'Katadyn',
    country: 'CH',
    categories: ['comfort'],
    models: {
      comfort: [{ name: 'PowerSurvivor 40E' }, { name: 'Survivor 35' }],
    },
  },
  {
    slug: 'schenker',
    name: 'Schenker',
    country: 'IT',
    categories: ['comfort'],
    aliases: ['schenker watermakers'],
    models: {
      comfort: [{ name: 'Zen 30' }, { name: 'Zen 50' }, { name: 'Smart 30' }],
    },
  },
  {
    slug: 'dessalator',
    name: 'Dessalator',
    country: 'FR',
    categories: ['comfort'],
    models: {
      comfort: [{ name: 'D30' }, { name: 'D60' }, { name: 'D100' }],
    },
  },
  {
    slug: 'spectra',
    name: 'Spectra',
    country: 'US',
    categories: ['comfort'],
    aliases: ['spectra watermakers'],
    models: {
      comfort: [{ name: 'Ventura 150' }, { name: 'Newport 400' }],
    },
  },
  {
    slug: 'rainman',
    name: 'Rainman',
    country: 'AU',
    categories: ['comfort'],
  },
]
