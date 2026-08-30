import type { EquipmentBrandSeed } from '#shared/types/equipment_catalog'

/**
 * Plomberie et circuit d'eau (#577) : pompes, WC marins, chauffe-eau, vannes.
 *
 * Règles de saisie : `database/data/equipment_catalog/README.md`.
 */
export const PLUMBING_BRANDS: readonly EquipmentBrandSeed[] = [
  {
    slug: 'jabsco',
    name: 'Jabsco',
    country: 'US',
    categories: ['plumbing'],
    aliases: ['xylem jabsco'],
    models: {
      plumbing: [
        { name: 'Par-Max 3' },
        { name: 'Par-Max 4' },
        { name: "Twist 'n' Lock" },
        { name: 'Quiet Flush E2' },
        { name: 'Lite Flush' },
      ],
    },
  },
  {
    slug: 'whale',
    name: 'Whale',
    country: 'GB',
    categories: ['plumbing'],
    aliases: ['whale pumps'],
    models: {
      plumbing: [
        { name: 'Gulper 220' },
        { name: 'Gusher 10' },
        { name: 'Supersub 650' },
        { name: 'Watermaster' },
      ],
    },
  },
  {
    slug: 'shurflo',
    name: 'Shurflo',
    country: 'US',
    categories: ['plumbing'],
    aliases: ['shur flo'],
    models: {
      plumbing: [{ name: 'Aqua King II 3.0' }, { name: 'Blaster II' }],
    },
  },
  {
    slug: 'johnson-pump',
    name: 'Johnson Pump',
    country: 'SE',
    categories: ['plumbing'],
    aliases: ['spx johnson', 'johnson'],
    models: {
      plumbing: [
        { name: 'Aqua Jet 3.5' },
        { name: 'Viking Power 16' },
        { name: 'Ultima Bilge 1000' },
      ],
    },
  },
  {
    slug: 'rule',
    name: 'Rule',
    country: 'US',
    categories: ['plumbing'],
    models: {
      plumbing: [
        { name: 'Rule 500' },
        { name: 'Rule 1100' },
        { name: 'Rule-Mate 750' },
        { name: 'LoPro 900' },
      ],
    },
  },
  {
    slug: 'tecma',
    name: 'Tecma',
    country: 'IT',
    categories: ['plumbing'],
    aliases: ['thetford tecma'],
    models: {
      plumbing: [{ name: 'Elegance 2G' }, { name: 'Silence Plus 2G' }],
    },
  },
  {
    slug: 'raritan',
    name: 'Raritan',
    country: 'US',
    categories: ['plumbing'],
    models: {
      plumbing: [{ name: 'PH II' }, { name: 'SeaEra' }, { name: 'Marine Elegance' }],
    },
  },
  {
    slug: 'thetford',
    name: 'Thetford',
    country: 'NL',
    categories: ['plumbing'],
    models: {
      plumbing: [{ name: 'Porta Potti 345' }, { name: 'Porta Potti 565E' }],
    },
  },
  {
    slug: 'isotemp',
    name: 'Isotemp',
    country: 'IT',
    // Les chauffe-eau d'Indel Webasto — marque sœur d'Isotherm (froid), à ne
    // pas fusionner : les deux noms coexistent sur les fiches produit.
    categories: ['plumbing'],
    models: {
      plumbing: [
        { name: 'Slim 15' },
        { name: 'Slim 20' },
        { name: 'Basic 24' },
        { name: 'Basic 30' },
        { name: 'Basic 40' },
      ],
    },
  },
  {
    slug: 'elgena',
    name: 'Elgena',
    country: 'DE',
    categories: ['plumbing'],
    models: {
      plumbing: [{ name: 'KB 3' }, { name: 'KB 6' }, { name: 'Nautic Therm' }],
    },
  },
  {
    slug: 'tmc',
    name: 'TMC',
    country: 'TW',
    categories: ['plumbing'],
  },
  {
    slug: 'attwood',
    name: 'Attwood',
    country: 'US',
    categories: ['plumbing'],
    models: {
      plumbing: [{ name: 'Tsunami T500' }, { name: 'Tsunami T800' }],
    },
  },
  {
    slug: 'seaflo',
    name: 'Seaflo',
    country: 'CN',
    categories: ['plumbing'],
  },
  {
    slug: 'trudesign',
    name: 'TruDesign',
    country: 'NZ',
    categories: ['plumbing'],
    aliases: ['tru design'],
  },
]
