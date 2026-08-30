import type { EquipmentBrandSeed } from '#shared/types/equipment_catalog'

/**
 * Électricité (#577) : batteries, chargeurs, convertisseurs, régulateurs,
 * panneaux solaires, distribution.
 *
 * Règles de saisie : `database/data/equipment_catalog/README.md`.
 */
export const ELECTRICAL_BRANDS: readonly EquipmentBrandSeed[] = [
  {
    slug: 'victron-energy',
    name: 'Victron Energy',
    country: 'NL',
    categories: ['electrical'],
    aliases: ['victron'],
    models: {
      electrical: [
        { name: 'MultiPlus 12/500' },
        { name: 'MultiPlus 12/800' },
        { name: 'MultiPlus 12/1600' },
        { name: 'MultiPlus-II 12/3000' },
        { name: 'Phoenix 12/375' },
        { name: 'Phoenix 12/800' },
        { name: 'Phoenix Smart IP43 12/30' },
        { name: 'SmartSolar MPPT 75/15' },
        { name: 'SmartSolar MPPT 100/30' },
        { name: 'SmartSolar MPPT 100/50' },
        { name: 'BlueSolar MPPT 75/15' },
        { name: 'BMV-712 Smart' },
        { name: 'SmartShunt 500A' },
        { name: 'Orion-Tr Smart 12/12-30' },
        { name: 'Blue Smart IP22 12/15' },
        { name: 'Blue Smart IP65 12/10' },
        { name: 'Cerbo GX' },
        { name: 'GX Touch 50' },
      ],
    },
  },
  {
    slug: 'mastervolt',
    name: 'Mastervolt',
    country: 'NL',
    categories: ['electrical'],
    models: {
      electrical: [
        { name: 'ChargeMaster 12/25' },
        { name: 'ChargeMaster Plus 12/35' },
        { name: 'Mass Combi 12/2000' },
        { name: 'MLI Ultra 12/1250' },
      ],
    },
  },
  {
    slug: 'cristec',
    name: 'Cristec',
    country: 'FR',
    categories: ['electrical'],
    models: {
      electrical: [{ name: 'CPS3 12V/25A' }, { name: 'YPOWER 12V/16A' }],
    },
  },
  {
    slug: 'sterling-power',
    name: 'Sterling Power',
    country: 'GB',
    categories: ['electrical'],
    aliases: ['sterling'],
    models: {
      electrical: [
        { name: 'ProCharge Ultra 12V 30A' },
        { name: 'BB1230 Battery-to-Battery' },
        { name: 'BB1260 Battery-to-Battery' },
      ],
    },
  },
  {
    slug: 'balmar',
    name: 'Balmar',
    country: 'US',
    categories: ['electrical'],
    models: {
      electrical: [{ name: 'SG200' }, { name: '621 Series Alternator' }, { name: 'MC-614' }],
    },
  },
  {
    slug: 'epever',
    name: 'EPEVER',
    country: 'CN',
    categories: ['electrical'],
    aliases: ['ep ever', 'epsolar'],
    models: {
      electrical: [{ name: 'Tracer 2210AN' }, { name: 'Tracer 3210AN' }, { name: 'XTRA 4210N' }],
    },
  },
  {
    slug: 'blue-sea-systems',
    name: 'Blue Sea Systems',
    country: 'US',
    categories: ['electrical'],
    aliases: ['blue sea'],
    models: {
      electrical: [
        { name: 'ML-ACR 7622' },
        { name: 'SafetyHub 150' },
        { name: 'ST Blade Fuse Block' },
      ],
    },
  },
  {
    slug: 'scheiber',
    name: 'Scheiber',
    country: 'FR',
    categories: ['electrical'],
  },
  {
    slug: 'cbe',
    name: 'CBE',
    country: 'IT',
    categories: ['electrical'],
  },
  {
    slug: 'trojan',
    name: 'Trojan',
    country: 'US',
    categories: ['electrical'],
    aliases: ['trojan battery'],
    models: {
      electrical: [{ name: 'T-105' }, { name: 'T-125' }],
    },
  },
  {
    slug: 'lifeline',
    name: 'Lifeline',
    country: 'US',
    categories: ['electrical'],
    aliases: ['lifeline batteries'],
    models: {
      electrical: [{ name: 'GPL-24T' }, { name: 'GPL-27T' }, { name: 'GPL-31T' }],
    },
  },
  {
    slug: 'optima',
    name: 'Optima',
    country: 'US',
    categories: ['electrical'],
    aliases: ['optima batteries'],
    models: {
      electrical: [{ name: 'BlueTop D34M' }, { name: 'BlueTop D31M' }],
    },
  },
  {
    slug: 'battle-born',
    name: 'Battle Born',
    country: 'US',
    categories: ['electrical'],
    aliases: ['battleborn'],
    models: {
      electrical: [{ name: 'BB10012' }, { name: 'GC2 100Ah' }],
    },
  },
  {
    slug: 'super-b',
    name: 'Super B',
    country: 'NL',
    categories: ['electrical'],
    aliases: ['superb'],
    models: {
      electrical: [{ name: 'Epsilon 12V150Ah' }, { name: 'Nomia 12V105Ah' }],
    },
  },
  {
    slug: 'promariner',
    name: 'ProMariner',
    country: 'US',
    categories: ['electrical'],
    aliases: ['pro mariner'],
    models: {
      electrical: [{ name: 'ProNautic 1220P' }, { name: 'ProSport HD 20' }],
    },
  },
  {
    slug: 'dolphin-charger',
    name: 'Dolphin Charger',
    country: 'FR',
    categories: ['electrical'],
    aliases: ['dolphin'],
    models: {
      electrical: [{ name: 'Pro 12V 25A' }, { name: 'Premium 12V 40A' }],
    },
  },
  {
    slug: 'wakespeed',
    name: 'Wakespeed',
    country: 'US',
    categories: ['electrical'],
    models: {
      electrical: [{ name: 'WS500' }],
    },
  },
  {
    slug: 'renogy',
    name: 'Renogy',
    country: 'US',
    categories: ['electrical'],
    models: {
      electrical: [{ name: 'Rover 40A' }, { name: 'DCC50S' }],
    },
  },
  {
    slug: 'solbian',
    name: 'Solbian',
    country: 'IT',
    categories: ['electrical'],
    models: {
      electrical: [{ name: 'SP 118' }, { name: 'SX 108' }],
    },
  },
  {
    slug: 'solara',
    name: 'Solara',
    country: 'DE',
    categories: ['electrical'],
  },
  {
    slug: 'xantrex',
    name: 'Xantrex',
    country: 'US',
    categories: ['electrical'],
    models: {
      electrical: [{ name: 'Freedom XC 2000' }, { name: 'PROwatt SW 1000' }],
    },
  },
  {
    slug: 'genasun',
    name: 'Genasun',
    country: 'US',
    categories: ['electrical'],
    models: {
      electrical: [{ name: 'GV-10' }, { name: 'GV-boost 105V' }],
    },
  },
  {
    slug: 'noco',
    name: 'NOCO',
    country: 'US',
    categories: ['electrical'],
    models: {
      electrical: [{ name: 'GENIUS10' }, { name: 'GEN5X2' }],
    },
  },
]
