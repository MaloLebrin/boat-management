import type { EquipmentBrandSeed } from '#shared/types/equipment_catalog'

/**
 * Pont et accastillage (#577) : winches, bloqueurs, rails, emmagasineurs,
 * espars. Lewmar (winches) est déclaré dans `anchoring.ts`, sa catégorie
 * principale.
 *
 * Règles de saisie : `database/data/equipment_catalog/README.md`.
 */
export const DECK_BRANDS: readonly EquipmentBrandSeed[] = [
  {
    slug: 'harken',
    name: 'Harken',
    country: 'US',
    categories: ['deck'],
    models: {
      deck: [
        { name: 'Radial 35.2 ST' },
        { name: 'Radial 40.2 ST' },
        { name: 'Radial 46.2 ST' },
        { name: 'Performa 40.2 ST' },
        { name: 'Reflex Unit 1' },
        { name: 'Carbo Air 40' },
      ],
    },
  },
  {
    slug: 'antal',
    name: 'Antal',
    country: 'IT',
    categories: ['deck'],
    models: {
      deck: [{ name: 'W40 ST' }, { name: 'XT40 ST' }],
    },
  },
  {
    slug: 'andersen',
    name: 'Andersen',
    country: 'DK',
    categories: ['deck'],
    models: {
      deck: [{ name: '28 ST' }, { name: '40 ST' }, { name: '46 ST' }],
    },
  },
  {
    slug: 'karver',
    name: 'Karver',
    country: 'FR',
    categories: ['deck'],
    aliases: ['karver systems'],
    models: {
      deck: [{ name: 'KF2' }, { name: 'KF5' }, { name: 'KSH Hook' }],
    },
  },
  {
    slug: 'spinlock',
    name: 'Spinlock',
    country: 'GB',
    categories: ['deck'],
    models: {
      deck: [{ name: 'XAS Clutch' }, { name: 'XTS Clutch' }, { name: 'XCS Clutch' }],
    },
  },
  {
    slug: 'wichard',
    name: 'Wichard',
    country: 'FR',
    categories: ['deck'],
  },
  {
    slug: 'facnor',
    name: 'Facnor',
    country: 'FR',
    categories: ['deck'],
    models: {
      deck: [{ name: 'LS100' }, { name: 'LS130' }, { name: 'LX130' }, { name: 'FX+2500' }],
    },
  },
  {
    slug: 'profurl',
    name: 'Profurl',
    country: 'FR',
    categories: ['deck'],
    models: {
      deck: [{ name: 'C290' }, { name: 'C350' }, { name: 'C420' }, { name: 'NEX 2.5' }],
    },
  },
  {
    slug: 'selden',
    name: 'Seldén',
    country: 'SE',
    categories: ['deck'],
    aliases: ['selden'],
    models: {
      deck: [{ name: 'Furlex 104S' }, { name: 'Furlex 204S' }, { name: 'Furlex 304S' }],
    },
  },
  {
    slug: 'z-spars',
    name: 'Z-Spars',
    country: 'FR',
    categories: ['deck'],
    aliases: ['z spars', 'zspars'],
  },
  {
    slug: 'sparcraft',
    name: 'Sparcraft',
    country: 'FR',
    categories: ['deck'],
  },
  {
    slug: 'ronstan',
    name: 'Ronstan',
    country: 'AU',
    categories: ['deck'],
    models: {
      deck: [{ name: 'Orbit Block 40' }, { name: 'Orbit Winch 40 QT' }],
    },
  },
  {
    slug: 'barton-marine',
    name: 'Barton Marine',
    country: 'GB',
    categories: ['deck'],
    aliases: ['barton'],
  },
  {
    slug: 'allen',
    name: 'Allen',
    country: 'GB',
    categories: ['deck'],
    aliases: ['allen brothers'],
  },
  {
    slug: 'bamar',
    name: 'Bamar',
    country: 'IT',
    categories: ['deck'],
  },
  {
    slug: 'reckmann',
    name: 'Reckmann',
    country: 'DE',
    categories: ['deck'],
  },
]
