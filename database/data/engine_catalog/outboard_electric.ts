import type { EngineBrandSeed } from '#shared/types/engine_catalog'

/**
 * Hors-bord et propulsion électriques (#573).
 *
 * Règles de saisie (détail : `database/data/engine_catalog/README.md`) —
 * `name` = désignation commerciale, jamais traduite ; `slug` kebab-case
 * **stable à vie** ; `aliases` = orthographes réellement rencontrées ; une
 * marque est déclarée une seule fois, ses modèles groupés par famille.
 *
 * `strokeType` n'a pas de sens ici : la colonne reste vide, elle n'est
 * renseignée que pour les moteurs thermiques. `powerHp` porte la **puissance
 * thermique équivalente** annoncée par le constructeur, celle qui figure sur
 * les fiches produit et que le plaisancier compare à un hors-bord thermique.
 */
export const OUTBOARD_ELECTRIC_BRANDS: readonly EngineBrandSeed[] = [
  {
    slug: 'torqeedo',
    name: 'Torqeedo',
    country: 'DE',
    families: ['outboard_electric'],
    aliases: ['torqeedo', 'torqueedo'],
    modelDefaults: { fuel: 'electric' },
    models: {
      outboard_electric: [
        { name: 'Ultralight 403', powerHp: 1 },
        { name: 'Travel 603', powerHp: 2 },
        { name: 'Travel 1103 C', powerHp: 3 },
        { name: 'Travel XP', powerHp: 3 },
        { name: 'Cruise 3.0 R', powerHp: 6 },
        { name: 'Cruise 3.0 T', powerHp: 6 },
        { name: 'Cruise 6.0 R', powerHp: 9.9 },
        { name: 'Cruise 6.0 T', powerHp: 9.9 },
        { name: 'Cruise 10.0 R', powerHp: 20 },
        { name: 'Cruise 12.0 R', powerHp: 25 },
        { name: 'Cruise 25.0 R', powerHp: 50 },
        { name: 'Deep Blue 25 R', powerHp: 25 },
        { name: 'Deep Blue 50 R', powerHp: 50 },
        { name: 'Deep Blue 100 i', powerHp: 100 },
        { name: 'Deep Blue 50 i', powerHp: 50 },
        { name: 'Deep Blue 25 i', powerHp: 25 },
        { name: 'Cruise 2.0 R', powerHp: 5 },
        { name: 'Cruise 4.0 FP', powerHp: 8 },
        { name: 'Travel 503', powerHp: 1.5 },
        { name: 'Travel 1003', powerHp: 3 },
      ],
    },
  },
  {
    slug: 'epropulsion',
    name: 'ePropulsion',
    country: 'CN',
    families: ['outboard_electric'],
    aliases: ['epropulsion', 'e-propulsion', 'e propulsion'],
    modelDefaults: { fuel: 'electric' },
    models: {
      outboard_electric: [
        { name: 'Spirit 1.0 Plus', powerHp: 3 },
        { name: 'Spirit 1.0 Evo', powerHp: 3 },
        { name: 'eLite', powerHp: 1 },
        { name: 'Navy 3.0 Evo', powerHp: 6 },
        { name: 'Navy 6.0 Evo', powerHp: 9.9 },
        { name: 'Navy 3.0', powerHp: 6 },
        { name: 'Navy 6.0', powerHp: 9.9 },
        { name: 'X12', powerHp: 25 },
        { name: 'X20', powerHp: 40 },
        { name: 'X40', powerHp: 80 },
        { name: 'I-20', powerHp: 40 },
        { name: 'I-40', powerHp: 80 },
        { name: 'Pod Drive 1.0 Evo', powerHp: 3 },
        { name: 'Pod Drive 3.0 Evo', powerHp: 6 },
        { name: 'Vaquita', powerHp: 1 },
        { name: 'H-100', powerHp: 100 },
      ],
    },
  },
  {
    slug: 'mercury-avator',
    name: 'Mercury Avator',
    country: 'US',
    families: ['outboard_electric'],
    aliases: ['avator', 'mercury avator'],
    modelDefaults: { fuel: 'electric' },
    models: {
      outboard_electric: [
        { name: 'Avator 7.5e', powerHp: 1 },
        { name: 'Avator 20e', powerHp: 2 },
        { name: 'Avator 35e', powerHp: 3.5 },
        { name: 'Avator 75e', powerHp: 7.5 },
        { name: 'Avator 110e', powerHp: 11 },
        { name: 'Avator 20R', powerHp: 20 },
        { name: 'Avator 35R', powerHp: 35 },
      ],
    },
  },
  {
    slug: 'temo',
    name: 'TEMO',
    country: 'FR',
    families: ['outboard_electric'],
    aliases: ['temo', 'temo marine'],
    modelDefaults: { fuel: 'electric' },
    models: {
      outboard_electric: [
        { name: 'TEMO·450', powerHp: 1 },
        { name: 'TEMO·1000', powerHp: 3 },
        { name: 'TEMO·450 S', powerHp: 1 },
      ],
    },
  },
  {
    slug: 'remigo',
    name: 'RemigoOne',
    country: 'SI',
    families: ['outboard_electric'],
    aliases: ['remigo', 'remigo one', 'remigoone'],
    modelDefaults: { fuel: 'electric' },
    models: {
      outboard_electric: [
        { name: 'RemigoOne 1000', powerHp: 3 },
        { name: 'RemigoOne 1000 Long', powerHp: 3 },
      ],
    },
  },
  {
    slug: 'oceanvolt',
    name: 'Oceanvolt',
    country: 'FI',
    families: ['outboard_electric'],
    aliases: ['oceanvolt', 'ocean volt'],
    modelDefaults: { fuel: 'electric' },
    models: {
      outboard_electric: [
        { name: 'SD8.6', powerHp: 12 },
        { name: 'SD15', powerHp: 20 },
        { name: 'SD25', powerHp: 34 },
        { name: 'ServoProp 15', powerHp: 20 },
        { name: 'ServoProp 25', powerHp: 34 },
        { name: 'AXC 15', powerHp: 20 },
        { name: 'AXC 20', powerHp: 27 },
        { name: 'HighPower 20', powerHp: 27 },
      ],
    },
  },
  {
    slug: 'elco-motor-yachts',
    name: 'Elco',
    country: 'US',
    families: ['outboard_electric'],
    aliases: ['elco', 'elco motor yachts'],
    modelDefaults: { fuel: 'electric' },
    models: {
      outboard_electric: [
        { name: 'EP-5', powerHp: 5 },
        { name: 'EP-9.9', powerHp: 9.9 },
        { name: 'EP-14', powerHp: 14 },
        { name: 'EP-20', powerHp: 20 },
        { name: 'EP-50', powerHp: 50 },
        { name: 'EP-100', powerHp: 100 },
        { name: 'EP-Launch 6', powerHp: 6 },
        { name: 'EP-Launch 12', powerHp: 12 },
        { name: 'EP-Launch 20', powerHp: 20 },
        { name: 'EP-Launch 40', powerHp: 40 },
      ],
    },
  },
  {
    slug: 'bellmarine',
    name: 'Bellmarine',
    country: 'NL',
    families: ['outboard_electric'],
    aliases: ['bellmarine', 'bell marine'],
    modelDefaults: { fuel: 'electric' },
    models: {
      outboard_electric: [
        { name: 'DriveMaster Ultimate 5', powerHp: 7 },
        { name: 'DriveMaster Ultimate 10', powerHp: 14 },
        { name: 'DriveMaster Ultimate 20', powerHp: 27 },
        { name: 'DriveMaster Ultimate 30', powerHp: 40 },
        { name: 'DriveMaster Ultimate 50', powerHp: 68 },
        { name: 'DriveMaster Compact 3', powerHp: 4 },
        { name: 'DriveMaster Compact 7', powerHp: 9.5 },
        { name: 'SailMaster 4', powerHp: 5.5 },
      ],
    },
  },
  {
    slug: 'minn-kota',
    name: 'Minn Kota',
    country: 'US',
    families: ['outboard_electric'],
    aliases: ['minn kota', 'minnkota'],
    modelDefaults: { fuel: 'electric' },
    models: {
      outboard_electric: [
        'Endura C2 30',
        'Endura C2 40',
        'Endura C2 55',
        'Riptide Terrova 55',
        'Riptide Terrova 80',
        'Riptide Instinct 80',
        'Riptide Ulterra 80',
        'Ultrex 80',
        'Traxxis 55',
        'PowerDrive 55',
      ],
    },
  },
]
