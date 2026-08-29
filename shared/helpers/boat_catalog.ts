import { BOAT_CATEGORIES, type BoatCategory } from '#shared/types/boat_catalog'

/**
 * Helpers purs du catalogue de bateaux (#571) — partagés par le seeder, le
 * service, la migration de backfill et le frontend.
 */

/** Retire les diacritiques d'une chaîne (`Bénéteau` → `Beneteau`). */
function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Slug kebab-case sans accent d'un nom commercial (`Fountaine Pajot` →
 * `fountaine-pajot`, `Sea-Doo` → `sea-doo`, `X-Yachts` → `x-yachts`).
 *
 * Le slug est **persisté et ne se renomme jamais** : cette fonction ne sert
 * qu'à le dériver la première fois, jamais à le recalculer sur de l'existant.
 */
export function slugifyCatalogName(name: string): string {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Clé de rapprochement d'une saisie libre : minuscule, sans accent, sans
 * ponctuation ni espace. `BENETEAU`, `Bénéteau` et `Béné-teau` donnent la même
 * clé, ce qui permet de rattacher les orthographes réellement rencontrées.
 */
export function normalizeCatalogText(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Correspondances du backfill de `boats.category` : la valeur texte libre de
 * `boats.type` déjà en base est rapprochée d'une catégorie du vocabulaire.
 *
 * Les motifs s'appliquent sur la forme **normalisée** (sans accent ni
 * séparateur) : `Catamaran à moteur` devient `catamaranamoteur`. L'ordre compte,
 * du plus spécifique au plus générique — `catamaran à moteur` doit tomber sur
 * `power_catamaran`, pas sur `sailboat_multihull`.
 */
const LEGACY_TYPE_PATTERNS: ReadonlyArray<readonly [RegExp, BoatCategory]> = [
  [/catamarana?moteur|powercat|motorcat/, 'power_catamaran'],
  [/semirigide|pneumatique|^rib$|^rib\d|zodiac/, 'rib'],
  [/jetski|motomarine|waverunner|seadoo|scooterdesmer/, 'jetski'],
  [/peniche|penichette|fluvial|houseboat|canalboat/, 'houseboat'],
  [/trawler|hauturiere/, 'trawler'],
  [/deriveur|voilelegere|dinghy|optimist/, 'dinghy'],
  [/annexe|tender|youyou/, 'tender'],
  [/classique|traditionnel|vieuxgreement/, 'classic'],
  [/servitude|workboat|remorqueur|pilotine|barge/, 'workboat'],
  [/pechepromenade|peche|fishing/, 'fishing'],
  [/dayboat|runabout|bowrider|^open/, 'open_dayboat'],
  [/trimaran|multicoque|catamarana?voile/, 'sailboat_multihull'],
  [/vedette|yacht|moteur|motorboat/, 'motor_yacht'],
  [/voilier|sailboat|monocoque|monohull|sloop|ketch|goelette|voile/, 'sailboat_monohull'],
  [/catamaran/, 'sailboat_multihull'],
]

/** Repli quand `type` n'a rien donné : la propulsion déjà saisie. */
const LEGACY_PROPULSION_MAP: Readonly<Record<string, BoatCategory>> = {
  sailboat: 'sailboat_monohull',
  motorboat: 'motor_yacht',
  catamaran: 'sailboat_multihull',
  rib: 'rib',
}

/**
 * Dérive une catégorie best-effort depuis les colonnes historiques d'un bateau.
 * Renvoie `null` quand rien ne permet de trancher : la colonne est nullable, on
 * ne devine pas.
 */
export function deriveCategoryFromLegacy(
  type: string | null | undefined,
  propulsionType: string | null | undefined
): BoatCategory | null {
  if (type) {
    const normalized = normalizeCatalogText(type)
    if (normalized) {
      // Une valeur déjà écrite avec le slug du vocabulaire passe telle quelle.
      const exact = BOAT_CATEGORIES.find(
        (category) => normalizeCatalogText(category) === normalized
      )
      if (exact) return exact

      for (const [pattern, category] of LEGACY_TYPE_PATTERNS) {
        if (pattern.test(normalized)) return category
      }
    }
  }

  if (propulsionType) {
    return LEGACY_PROPULSION_MAP[propulsionType.trim().toLowerCase()] ?? null
  }

  return null
}
