import {
  isEngineFamily,
  type EngineCatalogFamily,
  type EngineFamily,
  type EngineStrokeType,
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
 * Famille retenue pour tout contenu servi par motorisation — nomenclature de
 * pièces (#574), fiches de diagnostic (#576) : celle **saisie** sur le moteur,
 * sinon celle que `kind`/`fuel`/`stroke_type` permettent de déduire.
 *
 * Le repli sur la dérivation n'est pas de la redondance avec le backfill de la
 * migration : un moteur créé sans famille — l'API, un import, un formulaire
 * laissé vide — doit rendre la même chose qu'un moteur backfillé.
 */
export function resolveEngineFamily(
  engine: EngineFamilySignals & { family?: string | null }
): EngineFamily | null {
  if (isEngineFamily(engine.family)) return engine.family
  return engineFamilyFromSignals(engine)
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

/**
 * Familles du **catalogue** (#573) pertinentes pour le moteur en cours de
 * saisie (#597) — l'inverse de `engineFamilyFromCatalogModel`.
 *
 * Sert à faire dépendre le sélecteur de marque du type de moteur : un hors-bord
 * ne doit pas noyer Yamaha au milieu des motoristes in-bord, et la liste est
 * tronquée à cinquante suggestions — une marque hors du début de l'alphabet
 * pouvait tout simplement ne jamais s'afficher.
 *
 * Le résultat **priorise**, il ne filtre pas : un tableau vide veut dire « rien
 * à privilégier », jamais « aucune marque ». Toute marque, et toute saisie hors
 * catalogue, reste proposée et acceptée — c'est l'invariant de l'épic #572.
 *
 * `family` (la motorisation saisie, transmission comprise) l'emporte sur
 * `kind` + `fuel` : elle est plus précise et elle a été choisie explicitement.
 * Quand le carburant manque, on retient **les deux** familles plausibles plutôt
 * que d'en inventer une.
 */
export function engineCatalogFamiliesFromSignals(engine: {
  kind?: string | null
  fuel?: string | null
  family?: string | null
}): EngineCatalogFamily[] {
  const fromFamily = catalogFamiliesFromEngineFamily(engine.family)
  if (fromFamily) return [...fromFamily]

  const fuel = engine.fuel || null

  switch (engine.kind) {
    case 'outboard':
      if (fuel === 'electric') return ['outboard_electric']
      if (fuel === 'diesel' || fuel === 'essence') return ['outboard_thermal']
      return ['outboard_thermal', 'outboard_electric']
    case 'inboard':
      if (fuel === 'diesel') return ['inboard_diesel']
      if (fuel === 'essence') return ['inboard_petrol']
      // `outboard_electric` est la seule famille électrique du catalogue : son
      // libellé couvre les propulsions électriques, embase comprise.
      if (fuel === 'electric') return ['outboard_electric']
      return ['inboard_diesel', 'inboard_petrol']
    case 'electric':
      return ['outboard_electric']
    // `hybrid` et `other` ne désignent aucune gamme du catalogue : rien à
    // privilégier, la liste reste dans son ordre alphabétique.
    default:
      return []
  }
}

/**
 * Familles du catalogue couvertes par une famille de motorisation saisie.
 * `null` quand la valeur n'est pas une famille connue (ou n'a rien à
 * privilégier) — l'appelant retombe alors sur `kind` + `fuel`.
 */
function catalogFamiliesFromEngineFamily(
  family: string | null | undefined
): readonly EngineCatalogFamily[] | null {
  switch (family) {
    case 'outboard_2t':
    case 'outboard_4t':
      return ['outboard_thermal']
    case 'inboard_diesel_shaft':
    case 'inboard_diesel_saildrive':
    case 'pod_drive':
      return ['inboard_diesel']
    // L'embase Z est une installation essence dans le corpus, comme le dit le
    // libellé de `inboard_petrol` (« in-bord essence et embase Z »).
    case 'inboard_petrol':
    case 'sterndrive':
      return ['inboard_petrol']
    case 'jet':
      return ['jet']
    case 'electric_outboard':
    case 'electric_inboard':
      return ['outboard_electric']
    case 'generator':
      return ['generator']
    default:
      return null
  }
}
