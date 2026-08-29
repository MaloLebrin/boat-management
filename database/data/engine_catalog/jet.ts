import type { EngineBrandSeed } from '#shared/types/engine_catalog'

/**
 * Propulsion par jet (#573) — motorisations de jet-ski et turbines de
 * propulsion.
 *
 * Règles de saisie (détail : `database/data/engine_catalog/README.md`) —
 * `name` = désignation commerciale, jamais traduite ; `slug` kebab-case
 * **stable à vie** ; `aliases` = orthographes réellement rencontrées ; une
 * marque est déclarée une seule fois, ses modèles groupés par famille.
 *
 * `yamaha` seul désigne le motoriste hors-bord : les alias de la gamme jet sont
 * explicites (`yamaha jet`, `yamaha marine jet`) pour rester non ambigus.
 */
export const JET_BRANDS: readonly EngineBrandSeed[] = [
  {
    slug: 'rotax-brp',
    name: 'Rotax (BRP)',
    country: 'AT',
    families: ['jet'],
    aliases: ['rotax', 'brp rotax', 'rotax marine'],
    modelCodeFromName: true,
    modelDefaults: { fuel: 'essence', strokeType: '4_stroke' },
    models: {
      jet: [
        { name: '900 ACE', powerHp: 90, cylinders: 3 },
        { name: '900 ACE-90', powerHp: 90, cylinders: 3 },
        { name: '1503 NA', powerHp: 130, cylinders: 3 },
        { name: '1503 HO', powerHp: 155, cylinders: 3 },
        { name: '1503 SCIC', powerHp: 215, cylinders: 3 },
        { name: '1630 ACE-170', powerHp: 170, cylinders: 3 },
        { name: '1630 ACE-230', powerHp: 230, cylinders: 3 },
        { name: '1630 ACE-300', powerHp: 300, cylinders: 3 },
        { name: '1630 ACE-325', powerHp: 325, cylinders: 3 },
        { name: '947 2-Stroke', powerHp: 130, strokeType: '2_stroke', cylinders: 2 },
        { name: '787 RFI', powerHp: 110, strokeType: '2_stroke', cylinders: 2 },
        { name: '717 2-Stroke', powerHp: 85, strokeType: '2_stroke', cylinders: 2 },
      ],
    },
  },
  {
    slug: 'yamaha-marine-jet',
    name: 'Yamaha Marine Jet',
    country: 'JP',
    families: ['jet'],
    aliases: ['yamaha jet', 'yamaha marine jet', 'yamaha waverunner engine', 'yamaha svho'],
    modelCodeFromName: true,
    modelDefaults: { fuel: 'essence', strokeType: '4_stroke' },
    models: {
      jet: [
        { name: 'TR-1', powerHp: 100, cylinders: 3 },
        { name: 'TR-1 HO', powerHp: 130, cylinders: 3 },
        { name: '1.8L HO', powerHp: 180, cylinders: 4 },
        { name: '1.8L SVHO', powerHp: 250, cylinders: 4 },
        { name: '1.8L SHO', powerHp: 210, cylinders: 4 },
        { name: '1.9L SVHO', powerHp: 275, cylinders: 4 },
        { name: 'MR-1', powerHp: 140, cylinders: 4 },
        { name: 'MR-1 HO', powerHp: 160, cylinders: 4 },
        { name: '155 Marine Jet', powerHp: 155, cylinders: 4 },
        { name: '110 Marine Jet', powerHp: 110, strokeType: '2_stroke', cylinders: 3 },
      ],
    },
  },
  {
    slug: 'kawasaki-marine',
    name: 'Kawasaki Marine',
    country: 'JP',
    families: ['jet'],
    aliases: ['kawasaki', 'kawasaki marine', 'kawasaki jet ski'],
    modelCodeFromName: true,
    modelDefaults: { fuel: 'essence', strokeType: '4_stroke' },
    models: {
      jet: [
        { name: '1498cc Supercharged', powerHp: 310, cylinders: 4 },
        { name: '1498cc NA', powerHp: 160, cylinders: 4 },
        { name: '1052cc', powerHp: 120, cylinders: 4 },
        { name: '1100cc DI', powerHp: 130, strokeType: '2_stroke', cylinders: 3 },
        { name: '900cc 2-Stroke', powerHp: 100, strokeType: '2_stroke', cylinders: 3 },
        { name: '750cc 2-Stroke', powerHp: 80, strokeType: '2_stroke', cylinders: 2 },
        { name: 'Ultra 310 Engine', powerHp: 310, cylinders: 4 },
        { name: 'Ultra 160 Engine', powerHp: 160, cylinders: 4 },
        { name: 'STX-15F Engine', powerHp: 160, cylinders: 4 },
        { name: 'SX-R 1500', powerHp: 160, cylinders: 4 },
      ],
    },
  },
  {
    slug: 'hamilton-jet',
    name: 'HamiltonJet',
    country: 'NZ',
    families: ['jet'],
    aliases: ['hamilton', 'hamilton jet', 'hamiltonjet'],
    modelCodeFromName: true,
    models: {
      jet: [
        'HJ212',
        'HJ241',
        'HJ274',
        'HJ292',
        'HJ322',
        'HJ364',
        'HJ403',
        'HTX30',
        'HTX40',
        'HTX52',
        'HM461',
        'HM521',
      ],
    },
  },
  {
    slug: 'castoldi-jet',
    name: 'Castoldi',
    country: 'IT',
    families: ['jet'],
    aliases: ['castoldi', 'castoldi jet', 'castoldi turbodrive'],
    modelCodeFromName: true,
    models: {
      jet: [
        'Turbodrive 224',
        'Turbodrive 238',
        'Turbodrive 240',
        'Turbodrive 300',
        'Turbodrive 338',
        'Turbodrive 390',
        'Turbodrive 490',
        'Turbodrive 600',
        'DVJ 07',
        'DVJ 14',
      ],
    },
  },
  {
    slug: 'alamarin-jet',
    name: 'Alamarin-Jet',
    country: 'FI',
    families: ['jet'],
    aliases: ['alamarin', 'alamarin jet', 'alamarin-jet'],
    modelCodeFromName: true,
    models: {
      jet: ['AJ 145', 'AJ 185', 'AJ 240', 'AJ 285', 'AJ 340', 'AJ 370', 'AJ 400', 'AJ 460'],
    },
  },
]
