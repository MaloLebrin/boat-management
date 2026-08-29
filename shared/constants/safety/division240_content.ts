import type {
  ArmamentZone,
  Division240Lifetime,
  Division240Requirement,
} from '#shared/types/safety'
import { ARMAMENT_ZONE_RANK } from '#shared/types/safety'

/**
 * Corpus d'armement Division 240 (#582) — plaisance française.
 *
 * La Division 240 de l'arrêté du 23 novembre 1987 fixe le matériel de sécurité
 * exigé à bord des navires de plaisance de moins de 24 m, **selon la distance
 * d'un abri** : basique (≤ 2 M), côtier (≤ 6 M), semi-hauturier (≤ 60 M),
 * hauturier (> 60 M). C'est cette grandeur — et non la catégorie de conception
 * CE A–D — que porte `boats.armament_zone`.
 *
 * **Version du texte de référence : {@link DIVISION_240_TEXT_VERSION}.** La
 * Division 240 est modifiée régulièrement : la date ci-dessous dit sur quel état
 * du texte ce corpus a été écrit, et devra être relevée à chaque relecture.
 *
 * ⚠️ **Ce corpus aide au suivi, il ne remplace pas le texte officiel** ni un
 * contrôle des Affaires maritimes. Rien de ce qu'il produit n'est bloquant.
 *
 * **Invariants**
 *
 * - `key` est stable à vie : elle préfixe la clé i18n et identifie la ligne du
 *   rapport. On peut insérer une exigence, jamais en renommer une.
 * - `key` vaut `<minZone>.<equipmentType>` et `labelKey`
 *   `boats.safetyCompliance.requirements.<key>`, dans les deux locales.
 * - Les exigences sont **cumulatives** : une règle `coastal` s'applique aussi en
 *   `semi_offshore` et `offshore` (cf. {@link ARMAMENT_ZONE_RANK}).
 * - `equipmentType` appartient toujours au vocabulaire fermé de l'inventaire
 *   (`safetyEquipmentTypes`, 16 valeurs) : le corpus décrit ce que l'app sait
 *   suivre, pas l'intégralité du texte. Les éléments d'armement sans type
 *   d'inventaire correspondant sont listés dans
 *   {@link DIVISION_240_UNTRACKED_ITEMS} et affichés en note — jamais comptés
 *   dans le score, pour ne pas signaler « manquant » ce que l'utilisateur ne
 *   peut pas saisir.
 */
export const DIVISION_240_TEXT_VERSION = '2024-01'

/**
 * Référence commune : l'annexe 240-A.2 porte le tableau du matériel exigé par
 * zone. On ne cite volontairement pas de numéro d'article plus fin — une
 * référence approximative affichée à l'utilisateur serait pire qu'une référence
 * large et exacte.
 */
const ANNEX = '240-A.2'

function requirement(
  equipmentType: string,
  minZone: ArmamentZone,
  quantity: Division240Requirement['quantity'],
  options: { sailingOnly?: boolean } = {}
): Division240Requirement {
  const key = `${minZone}.${equipmentType}`
  return {
    key,
    equipmentType,
    minZone,
    quantity,
    labelKey: `boats.safetyCompliance.requirements.${key}`,
    articleRef: ANNEX,
    ...(options.sailingOnly ? { sailingOnly: true } : {}),
  }
}

function lifetime(
  equipmentType: string,
  months: number,
  kind: Division240Lifetime['kind']
): Division240Lifetime {
  return {
    equipmentType,
    months,
    kind,
    articleRef: ANNEX,
    labelKey: `boats.safetyCompliance.lifetimes.${equipmentType}`,
  }
}

const ONE = { kind: 'fixed', value: 1 } as const
const PER_PERSON = { kind: 'per_person' } as const

export const DIVISION_240_REQUIREMENTS: readonly Division240Requirement[] = [
  // ── Basique (≤ 2 milles d'un abri) ───────────────────────────────────────
  requirement('life_jacket', 'basic', PER_PERSON),
  requirement('bilge_pump', 'basic', ONE),
  requirement('anchor', 'basic', ONE),
  requirement('fire_extinguisher', 'basic', ONE),

  // ── Côtier (≤ 6 milles) ──────────────────────────────────────────────────
  requirement('flare', 'coastal', { kind: 'fixed', value: 3 }),
  requirement('compass', 'coastal', ONE),

  // ── Semi-hauturier (≤ 60 milles) ─────────────────────────────────────────
  requirement('life_raft', 'semi_offshore', ONE),
  requirement('first_aid_kit', 'semi_offshore', ONE),
  requirement('vhf_radio', 'semi_offshore', ONE),
  requirement('lifebuoy', 'semi_offshore', ONE),
  requirement('harness', 'semi_offshore', PER_PERSON, { sailingOnly: true }),

  // ── Hauturier (> 60 milles) ──────────────────────────────────────────────
  requirement('epirb', 'offshore', ONE),
  requirement('gps', 'offshore', ONE),
]

/**
 * Durées de vie et périodicités de révision, utilisées **en défaut** quand
 * `expiry_date` est vide mais `purchased_at` connue. Une date saisie par
 * l'utilisateur prime toujours.
 *
 * Ces durées sont indicatives : la notice du fabricant et le texte officiel
 * restent la référence (un radeau peut être donné pour 2 ou 3 ans entre deux
 * révisions selon le modèle et le contrat d'entretien).
 */
export const DIVISION_240_LIFETIMES: readonly Division240Lifetime[] = [
  lifetime('flare', 36, 'expiry'),
  lifetime('first_aid_kit', 36, 'expiry'),
  lifetime('fire_extinguisher', 12, 'review'),
  lifetime('life_raft', 12, 'review'),
  lifetime('life_jacket', 24, 'review'),
  lifetime('epirb', 60, 'review'),
]

/**
 * Éléments d'armement exigés par le texte que le vocabulaire d'inventaire
 * (16 types) ne sait pas représenter aujourd'hui. Affichés en note de bas du
 * panneau — jamais comptés comme manquants.
 *
 * Chaque clé rend `boats.safetyCompliance.untracked.<clé>` dans les deux locales.
 */
export const DIVISION_240_UNTRACKED_ITEMS = [
  'individual_light',
  'towing_line',
  'colreg_rules',
  'charts',
  'weather_forecast',
  'summary_document',
] as const

/** Index `equipmentType → durée de vie`, pour un accès O(1). */
export const DIVISION_240_LIFETIME_INDEX: ReadonlyMap<string, Division240Lifetime> = new Map(
  DIVISION_240_LIFETIMES.map((entry) => [entry.equipmentType, entry])
)

/** Index `key → exigence`. */
export const DIVISION_240_REQUIREMENT_INDEX: ReadonlyMap<string, Division240Requirement> = new Map(
  DIVISION_240_REQUIREMENTS.map((req) => [req.key, req])
)

/**
 * Exigences applicables à une zone : toutes celles dont la `minZone` est au plus
 * aussi éloignée que la zone demandée (cumul basique → hauturier).
 *
 * @param zone zone d'armement déclarée du bateau
 * @returns les exigences du corpus applicables, dans l'ordre du corpus
 */
export function requirementsForZone(zone: ArmamentZone): readonly Division240Requirement[] {
  const rank = ARMAMENT_ZONE_RANK[zone]
  return DIVISION_240_REQUIREMENTS.filter((req) => ARMAMENT_ZONE_RANK[req.minZone] <= rank)
}

/** Durée de vie par défaut d'un type d'équipement, ou `null` si le corpus n'en fixe pas. */
export function lifetimeFor(equipmentType: string): Division240Lifetime | null {
  return DIVISION_240_LIFETIME_INDEX.get(equipmentType) ?? null
}

/**
 * Options de zone d'armement pour les `<select>`. Les libellés ci-dessous sont
 * un repli EN : l'affichage passe par `t('boats.options.armamentZone.<zone>')`.
 */
export const ARMAMENT_ZONE_OPTIONS: readonly { value: ArmamentZone; label: string }[] = [
  { value: 'basic', label: 'Sheltered (≤ 2 NM from shelter)' },
  { value: 'coastal', label: 'Coastal (≤ 6 NM)' },
  { value: 'semi_offshore', label: 'Semi-offshore (≤ 60 NM)' },
  { value: 'offshore', label: 'Offshore (> 60 NM)' },
]
