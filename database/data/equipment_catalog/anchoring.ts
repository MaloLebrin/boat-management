import type { EquipmentBrandSeed } from '#shared/types/equipment_catalog'

/**
 * Mouillage (#577) : guindeaux, ancres, chaînes.
 *
 * Règles de saisie : `database/data/equipment_catalog/README.md`. L'ancre
 * Kobra est chez Plastimo (`navigation.ts`, marque multi-catégories).
 */
export const ANCHORING_BRANDS: readonly EquipmentBrandSeed[] = [
  {
    slug: 'lofrans',
    name: 'Lofrans',
    country: 'IT',
    categories: ['anchoring'],
    aliases: ["lofrans'"],
    models: {
      anchoring: [
        { name: 'Tigres' },
        { name: 'Cayman 88' },
        { name: 'Kobra', aliases: ['kobra windlass'] },
        { name: 'Project 1000' },
        { name: 'Project 1500' },
        { name: 'X1' },
        { name: 'X2' },
        { name: 'X3' },
        { name: 'Falkon' },
      ],
    },
  },
  {
    slug: 'quick',
    name: 'Quick',
    country: 'IT',
    // Guindeaux côté mouillage, chargeurs côté électricité, chauffe-eau côté
    // plomberie — la marque couvre les trois rayons.
    categories: ['anchoring', 'electrical', 'plumbing'],
    aliases: ['quick nautical equipment'],
    models: {
      anchoring: [
        { name: 'Eagle 500' },
        { name: 'Eagle 700' },
        { name: 'Prince DP2 500' },
        { name: 'Prince DP2 1000' },
        { name: 'Hector HC3 1700' },
      ],
      electrical: [{ name: 'SBC 140 NRG+' }, { name: 'SBC 300 NRG+' }],
      plumbing: [{ name: 'Nautic Boiler B3 15L' }, { name: 'Nautic Boiler B3 20L' }],
    },
  },
  {
    slug: 'lewmar',
    name: 'Lewmar',
    country: 'GB',
    categories: ['anchoring', 'deck'],
    models: {
      anchoring: [
        { name: 'V700' },
        { name: 'V1' },
        { name: 'V2' },
        { name: 'V3' },
        { name: 'CPX1' },
        { name: 'CPX2' },
        { name: 'CPX3' },
        { name: 'Pro-Series 700' },
        { name: 'Delta 10 kg', aliases: ['delta'] },
        { name: 'Delta 16 kg' },
        { name: 'Epsilon 10 kg' },
      ],
      deck: [
        { name: 'EVO 30ST' },
        { name: 'EVO 40ST' },
        { name: 'EVO 45ST' },
        { name: 'Ocean 30ST' },
      ],
    },
  },
  {
    slug: 'vetus',
    name: 'Vetus',
    country: 'NL',
    // Guindeaux et propulseurs côté mouillage/pont, réservoirs et circuits
    // d'eau côté plomberie.
    categories: ['anchoring', 'plumbing', 'electrical'],
    models: {
      anchoring: [{ name: 'Maxwell RC8' }, { name: 'BOW PRO 42' }, { name: 'BOW PRO 57' }],
    },
  },
  {
    slug: 'italwinch',
    name: 'Italwinch',
    country: 'IT',
    categories: ['anchoring'],
    models: {
      anchoring: [{ name: 'Smart 500' }, { name: 'Smart 1000' }, { name: 'Obi' }],
    },
  },
  {
    slug: 'maxwell',
    name: 'Maxwell',
    country: 'NZ',
    categories: ['anchoring'],
    aliases: ['maxwell marine'],
    models: {
      anchoring: [{ name: 'RC8' }, { name: 'RC10' }, { name: 'HRC10' }],
    },
  },
  {
    slug: 'rocna',
    name: 'Rocna',
    country: 'NZ',
    categories: ['anchoring'],
    models: {
      anchoring: [
        { name: 'Rocna 10' },
        { name: 'Rocna 15' },
        { name: 'Rocna 20' },
        { name: 'Rocna 25' },
        { name: 'Vulcan 9' },
        { name: 'Vulcan 12' },
        { name: 'Vulcan 16' },
      ],
    },
  },
  {
    slug: 'spade',
    name: 'Spade',
    country: 'TN',
    categories: ['anchoring'],
    aliases: ['spade anchor'],
    models: {
      anchoring: [{ name: 'S60' }, { name: 'S80' }, { name: 'S100' }],
    },
  },
  {
    slug: 'fortress',
    name: 'Fortress',
    country: 'US',
    categories: ['anchoring'],
    aliases: ['fortress marine anchors'],
    models: {
      anchoring: [{ name: 'FX-7' }, { name: 'FX-11' }, { name: 'FX-16' }, { name: 'FX-23' }],
    },
  },
  {
    slug: 'manson',
    name: 'Manson',
    country: 'NZ',
    categories: ['anchoring'],
    aliases: ['manson anchors'],
    models: {
      anchoring: [{ name: 'Supreme 10 kg' }, { name: 'Boss 8 kg' }],
    },
  },
  {
    slug: 'ultra-marine',
    name: 'Ultra Marine',
    country: 'TR',
    categories: ['anchoring'],
    aliases: ['ultra anchor'],
  },
  {
    slug: 'wasi',
    name: 'Wasi',
    country: 'DE',
    categories: ['anchoring'],
    // La Bügel est l'ancre que tout le monde nomme sans connaître la marque.
    aliases: ['bugel', 'bügel', 'wasi bugel'],
  },
]
