import type { SailLoftSeed } from '#shared/types/sail_loft'

/**
 * Corpus v1 du référentiel des voileries (#578). Voir `README.md` pour les
 * règles de saisie — ce sont celles des catalogues #571/#573/#577.
 *
 * Pas de fichiers par catégorie : le corpus est modeste (~40 entrées) et une
 * voilerie n'a pas de catégorie. Ordre indicatif : internationales, puis
 * françaises, puis régate/course et ateliers historiques.
 */
const SAIL_LOFT_ENTRIES: readonly SailLoftSeed[] = [
  // — Internationales —
  { slug: 'north-sails', name: 'North Sails', country: 'US', aliases: ['north'] },
  {
    slug: 'quantum-sails',
    name: 'Quantum Sails',
    country: 'US',
    aliases: ['quantum', 'quantum sail design group'],
  },
  { slug: 'doyle-sails', name: 'Doyle Sails', country: 'NZ', aliases: ['doyle'] },
  {
    slug: 'uk-sailmakers',
    name: 'UK Sailmakers',
    country: 'US',
    aliases: ['uk sails', 'uk halsey'],
  },
  { slug: 'onesails', name: 'OneSails', country: 'IT', aliases: ['one sails'] },
  { slug: 'elvstrom-sails', name: 'Elvström Sails', country: 'DK', aliases: ['elvstrom'] },
  { slug: 'ullman-sails', name: 'Ullman Sails', country: 'US', aliases: ['ullman'] },
  {
    slug: 'hood-sailmakers',
    name: 'Hood Sailmakers',
    country: 'US',
    aliases: ['hood', 'hood sails'],
  },
  {
    slug: 'neil-pryde-sails',
    name: 'Neil Pryde Sails',
    country: 'HK',
    aliases: ['neilpryde', 'neil pryde'],
  },
  {
    slug: 'rolly-tasker-sails',
    name: 'Rolly Tasker Sails',
    country: 'TH',
    aliases: ['rolly tasker'],
  },
  { slug: 'lee-sails', name: 'Lee Sails', country: 'HK', aliases: ['lee'] },
  { slug: 'far-east-sails', name: 'Far East Sails', country: 'CN', aliases: ['far east'] },
  { slug: 'precision-sails', name: 'Precision Sails', country: 'CA' },
  { slug: 'evolution-sails', name: 'Evolution Sails', country: 'NZ' },
  { slug: 'wb-sails', name: 'WB-Sails', country: 'FI', aliases: ['wb sails', 'wb'] },
  { slug: 'gransegel', name: 'Gransegel', country: 'SE', aliases: ['gran segel'] },
  { slug: 'zaoli-sails', name: 'Zaoli Sails', country: 'IT', aliases: ['zaoli'] },
  { slug: 'olimpic-sails', name: 'Olimpic Sails', country: 'IT', aliases: ['olimpic'] },
  { slug: 'beilken-sails', name: 'Beilken Sails', country: 'DE', aliases: ['beilken'] },
  { slug: 'fritz-segel', name: 'Fritz Segel', country: 'DE', aliases: ['fritz'] },

  // — Royaume-Uni —
  { slug: 'banks-sails', name: 'Banks Sails', country: 'GB', aliases: ['banks'] },
  { slug: 'hyde-sails', name: 'Hyde Sails', country: 'GB', aliases: ['hyde'] },
  { slug: 'sanders-sails', name: 'Sanders Sails', country: 'GB', aliases: ['sanders'] },
  { slug: 'crusader-sails', name: 'Crusader Sails', country: 'GB', aliases: ['crusader'] },
  { slug: 'kemp-sails', name: 'Kemp Sails', country: 'GB', aliases: ['kemp'] },
  { slug: 'jeckells', name: 'Jeckells', country: 'GB', aliases: ['jeckells the sailmakers'] },
  { slug: 'dolphin-sails', name: 'Dolphin Sails', country: 'GB' },
  { slug: 'batt-sails', name: 'Batt Sails', country: 'GB', aliases: ['batt'] },
  { slug: 'pinnell-and-bax', name: 'Pinnell & Bax', country: 'GB', aliases: ['p&b', 'p and b'] },

  // — États-Unis (ateliers historiques) —
  { slug: 'shore-sails', name: 'Shore Sails', country: 'US', aliases: ['shore'] },
  {
    slug: 'haarstick-sailmakers',
    name: 'Haarstick Sailmakers',
    country: 'US',
    aliases: ['haarstick'],
  },
  { slug: 'sobstad-sails', name: 'Sobstad Sails', country: 'US', aliases: ['sobstad'] },
  { slug: 'mack-sails', name: 'Mack Sails', country: 'US', aliases: ['mack'] },
  { slug: 'schurr-sails', name: 'Schurr Sails', country: 'US', aliases: ['schurr'] },

  // — Françaises —
  {
    slug: 'incidence-sails',
    name: 'Incidence Sails',
    country: 'FR',
    aliases: ['incidence', 'incidences', 'incidence voiles'],
  },
  { slug: 'delta-voiles', name: 'Delta Voiles', country: 'FR', aliases: ['delta'] },
  {
    slug: 'all-purpose',
    name: 'All Purpose',
    country: 'FR',
    aliases: ['all purpose voilerie'],
  },
  {
    slug: 'technique-voile',
    name: 'Technique Voile',
    country: 'FR',
    aliases: ['technique voiles'],
  },
  { slug: 'voilerie-lonne', name: 'Voilerie Lonné', country: 'FR', aliases: ['lonne'] },
  { slug: 'voilerie-burgaud', name: 'Voilerie Burgaud', country: 'FR', aliases: ['burgaud'] },
  { slug: 'voilerie-tarot', name: 'Voilerie Tarot', country: 'FR', aliases: ['tarot'] },
  { slug: 'assistance-voile', name: 'Assistance Voile', country: 'FR' },
]

/**
 * Voileries du corpus, dédoublonnage vérifié : un slug en double serait résolu
 * silencieusement par le seeder en écrasant la première entrée — d'où l'échec
 * explicite.
 */
export const SAIL_LOFTS: readonly SailLoftSeed[] = (() => {
  const bySlug = new Map<string, SailLoftSeed>()
  for (const loft of SAIL_LOFT_ENTRIES) {
    const existing = bySlug.get(loft.slug)
    if (existing) {
      throw new Error(
        `Référentiel voileries : le slug « ${loft.slug} » est déclaré deux fois ` +
          `(« ${existing.name} » et « ${loft.name} »).`
      )
    }
    bySlug.set(loft.slug, loft)
  }
  return [...bySlug.values()]
})()
