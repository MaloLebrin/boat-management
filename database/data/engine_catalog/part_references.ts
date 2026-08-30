import type { EnginePartReferenceSeed } from '#shared/types/engine_catalog'

/**
 * Corpus initial des références constructeur rattachées à un couple
 * (modèle moteur, pièce) — #575.
 *
 * ## Règle unique
 *
 * **Une entrée sans source ne se saisit pas.** `sourceLabel` est obligatoire
 * dans le type comme en base (`NOT NULL`) : c'est la traduction en contrainte
 * du critère d'acceptation de #517, « aucune référence n'est affichée sans
 * indication de sa source ».
 *
 * ## Priorisation
 *
 * L'exhaustivité n'est pas l'objectif — les catalogues revendeurs restent le
 * parcours de référence, et une pièce absente d'ici affiche exactement l'écran
 * d'avant (liens vers la vue éclatée). On saisit donc, dans l'ordre :
 *
 * 1. les **pièces d'usure** (turbines, kits de pompe à eau, filtres, anodes,
 *    joints de saildrive, courroies) — ce qu'on cherche en urgence, à quai ;
 * 2. les **modèles déjà présents dans l'app** (`malo_seeder`, `sandbox_seeder`),
 *    pour que la démo et la sandbox soient démonstratives ;
 * 3. le reste au fil de l'eau.
 *
 * ## `verifiedAt`
 *
 * Renseigné **uniquement** après recontrôle de l'entrée sur la source citée.
 * Les entrées de ce corpus initial le laissent vide à dessein : l'écran les
 * affiche alors avec la mention « à revérifier avant de commander », plutôt que
 * de les présenter comme certaines. C'est aussi ce qui permet de repérer les
 * entrées à recontrôler quand le corpus grossira.
 *
 * ## Reprise de catalogue
 *
 * Hors périmètre, définitivement : les contenus des catalogues revendeurs sont
 * sous droits. La saisie est manuelle et sourcée, entrée par entrée.
 */
export const ENGINE_PART_REFERENCES: readonly EnginePartReferenceSeed[] = [
  // ---------------------------------------------------------------------
  // Yamaha — hors-bord. Les kits de pompe à eau et turbines sont la pièce
  // d'usure numéro un d'un hors-bord : elle se change tous les deux ou trois
  // ans, et c'est elle qu'on cherche moteur en surchauffe.
  // ---------------------------------------------------------------------
  {
    brandSlug: 'yamaha',
    modelSlug: '4as',
    partKey: 'lower-unit.impeller',
    reference: '6E0-44352-00',
    sourceLabel: 'Catalogue Partzilla — Yamaha',
    sourceUrl: 'https://www.partzilla.com/catalog/yamaha',
  },
  {
    brandSlug: 'yamaha',
    modelSlug: '4as',
    partKey: 'lower-unit.water_pump_kit',
    reference: '6E0-W0078-00',
    sourceLabel: 'Catalogue Partzilla — Yamaha',
    sourceUrl: 'https://www.partzilla.com/catalog/yamaha',
  },
  {
    brandSlug: 'yamaha',
    modelSlug: 'f8',
    partKey: 'lower-unit.impeller',
    reference: '68T-44352-00',
    sourceLabel: 'Catalogue Partzilla — Yamaha',
    sourceUrl: 'https://www.partzilla.com/catalog/yamaha',
  },
  {
    brandSlug: 'yamaha',
    modelSlug: 'f8',
    partKey: 'lower-unit.water_pump_kit',
    reference: '68T-W0078-00',
    sourceLabel: 'Catalogue Partzilla — Yamaha',
    sourceUrl: 'https://www.partzilla.com/catalog/yamaha',
  },
  {
    brandSlug: 'yamaha',
    modelSlug: 'f150',
    partKey: 'lower-unit.impeller',
    reference: '63P-44352-01',
    sourceLabel: 'Catalogue Boats.net — Yamaha',
    sourceUrl: 'https://www.boats.net/catalog/yamaha',
  },
  {
    brandSlug: 'yamaha',
    modelSlug: 'f150',
    partKey: 'lower-unit.water_pump_kit',
    reference: '63P-W0078-00',
    sourceLabel: 'Catalogue Boats.net — Yamaha',
    sourceUrl: 'https://www.boats.net/catalog/yamaha',
  },

  // ---------------------------------------------------------------------
  // Volvo Penta — in-bord diesel. Le D1-20 est le moteur du seeder sandbox :
  // ses consommables d'entretien annuel sont ce qu'un exploitant commande le
  // plus souvent.
  // ---------------------------------------------------------------------
  {
    brandSlug: 'volvo-penta',
    modelSlug: 'd1-20',
    partKey: 'lubrication.oil_filter',
    reference: '861473',
    sourceLabel: 'Catalogue Volvo Penta — pièces d’entretien D1',
    sourceUrl: 'https://www.volvopenta.com/',
  },
  {
    brandSlug: 'volvo-penta',
    modelSlug: 'd1-20',
    partKey: 'injection.fuel_filter',
    reference: '861477',
    sourceLabel: 'Catalogue Volvo Penta — pièces d’entretien D1',
    sourceUrl: 'https://www.volvopenta.com/',
  },

  // ---------------------------------------------------------------------
  // Mercury — hors-bord. Le 60 EFI est le second moteur du seeder sandbox.
  // ---------------------------------------------------------------------
  {
    brandSlug: 'mercury-mariner',
    modelSlug: 'f60-fourstroke',
    partKey: 'lower-unit.water_pump_kit',
    reference: '817275A5',
    sourceLabel: 'Catalogue Partzilla — Mercury',
    sourceUrl: 'https://www.partzilla.com/catalog/mercury',
  },
]
