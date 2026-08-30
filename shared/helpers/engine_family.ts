import type {
  EngineCatalogFamily,
  EngineFamily,
  EngineStrokeType,
} from '#shared/types/engine_catalog'

/**
 * Dérivation **best-effort** de la famille de motorisation (#574).
 *
 * La famille est saisie par l'utilisateur (`boat_engines.family`) : c'est la
 * seule source qui connaisse la transmission. Ces helpers ne servent qu'à
 * proposer une valeur de départ — backfill de la migration, pré-remplissage du
 * formulaire au choix d'un modèle du catalogue — et renvoient `null` dès que la
 * réponse serait une invention. Un moteur sans famille reste valide : la
 * nomenclature de pièces retombe alors sur les ensembles génériques.
 */

/** Signature minimale d'un moteur, côté base comme côté formulaire. */
export interface EngineFamilySignals {
  kind?: string | null
  fuel?: string | null
  strokeType?: string | null
}

/**
 * Famille déduite de `kind` + `fuel` + `stroke_type`.
 *
 * Deux choix assumés, alignés sur le backfill de la migration
 * `1838000000000_alter_boat_engines_add_family` :
 *
 * - un **hors-bord sans cycle renseigné** est classé `outboard_4t` plutôt que
 *   laissé sans famille : les deux familles hors-bord partagent presque toute
 *   la nomenclature (seule `lubrication` est propre au 4 temps), et le 4 temps
 *   est le cas dominant du parc. Sans ce défaut, tous les hors-bord déjà
 *   enregistrés perdraient l'écran pièces qu'ils ont depuis #517 ;
 * - un **in-bord diesel** est classé `inboard_diesel_shaft` : la variante
 *   saildrive n'est pas devinable, l'utilisateur la précise. Même règle pour un
 *   `kind` `electric` (in-bord ou hors-bord indécidable) ou un in-bord dont le
 *   carburant est inconnu (diesel et essence n'ont ni injection ni allumage en
 *   commun) : `null`, et l'écran reste utilisable en générique.
 */
export function engineFamilyFromSignals(engine: EngineFamilySignals): EngineFamily | null {
  const kind = engine.kind ?? null
  const fuel = engine.fuel ?? null
  const strokeType = engine.strokeType ?? null

  if (kind === 'outboard') {
    if (fuel === 'electric') return 'electric_outboard'
    return strokeType === '2_stroke' ? 'outboard_2t' : 'outboard_4t'
  }

  if (kind === 'inboard') {
    if (fuel === 'diesel') return 'inboard_diesel_shaft'
    if (fuel === 'essence') return 'inboard_petrol'
    if (fuel === 'electric') return 'electric_inboard'
    return null
  }

  if (kind === 'hybrid') return 'hybrid'

  return null
}

/**
 * Famille déduite d'un modèle du catalogue (#573) retenu dans le formulaire.
 *
 * Le catalogue classe des **gammes**, pas des installations : il ne sait rien
 * de la transmission. On retient donc la variante la plus courante (ligne
 * d'arbre pour un diesel), à charge pour l'utilisateur de corriger — le
 * pré-remplissage du formulaire ne touche que les champs restés vides.
 */
export function engineFamilyFromCatalogModel(model: {
  family: EngineCatalogFamily
  strokeType?: EngineStrokeType | null
  fuel?: string | null
}): EngineFamily | null {
  switch (model.family) {
    case 'outboard_thermal':
      return model.strokeType === '2_stroke' ? 'outboard_2t' : 'outboard_4t'
    case 'outboard_electric':
      return 'electric_outboard'
    case 'inboard_diesel':
      return 'inboard_diesel_shaft'
    case 'inboard_petrol':
      return 'inboard_petrol'
    case 'jet':
      return 'jet'
    case 'generator':
      return 'generator'
    default:
      return null
  }
}
