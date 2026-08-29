/**
 * Armement de sécurité et conformité Division 240 (#582).
 *
 * Le corpus réglementaire vit dans `#shared/constants/safety/division240_content`,
 * le calcul du rapport dans `#services/boat_safety_compliance_service`.
 */

/**
 * Zone d'armement déclarée par l'utilisateur — la **distance d'un abri**, seule
 * grandeur sur laquelle raisonne la Division 240.
 *
 * ⚠️ À ne pas confondre avec `boats.navigation_category` (catégorie de
 * conception CE A–D), qui décrit ce que la coque peut encaisser et n'a aucun
 * effet réglementaire sur l'armement : un bateau de catégorie B peut très bien
 * naviguer en zone `basic`, et inversement.
 *
 * L'ordre du tableau est **croissant** (du plus près de l'abri au plus loin) et
 * porte la sémantique du corpus : une exigence de zone `coastal` s'applique
 * aussi en `semi_offshore` et `offshore`.
 */
export const ARMAMENT_ZONES = ['basic', 'coastal', 'semi_offshore', 'offshore'] as const
export type ArmamentZone = (typeof ARMAMENT_ZONES)[number]

/** Rang d'une zone dans l'échelle d'éloignement (0 = basique). */
export const ARMAMENT_ZONE_RANK: Readonly<Record<ArmamentZone, number>> = {
  basic: 0,
  coastal: 1,
  semi_offshore: 2,
  offshore: 3,
}

/** Quantité exigée par une règle d'armement. */
export type Division240Quantity =
  /** Une unité par personne embarquée (`boats.max_persons`). */
  | { kind: 'per_person' }
  /** Quantité fixe, indépendante de l'équipage. */
  | { kind: 'fixed'; value: number }

/**
 * Une exigence du corpus : un type d'équipement de l'inventaire, exigé à partir
 * d'une zone, dans une quantité donnée.
 */
export interface Division240Requirement {
  /** Clé stable à vie (préfixe i18n, jamais renommée). */
  key: string
  /** Type de l'inventaire `boat_safety_equipment` qui satisfait l'exigence. */
  equipmentType: string
  /** Zone à partir de laquelle l'exigence s'applique (cumulatif). */
  minZone: ArmamentZone
  quantity: Division240Quantity
  /** `boats.safetyCompliance.requirements.<key>` */
  labelKey: string
  /** Référence du texte source (annexe / article de la Division 240). */
  articleRef: string
  /** Restreint l'exigence aux voiliers (harnais, par exemple). */
  sailingOnly?: boolean
}

/**
 * Durée de vie réglementaire ou de révision d'un type d'équipement. Sert de
 * **défaut** quand `expiry_date` n'est pas saisie mais que `purchased_at` l'est.
 */
export interface Division240Lifetime {
  equipmentType: string
  /** Durée depuis l'achat, en mois. */
  months: number
  /** `expiry` = péremption du matériel ; `review` = révision / vérification périodique. */
  kind: 'expiry' | 'review'
  articleRef: string
  /** `boats.safetyCompliance.lifetimes.<equipmentType>` */
  labelKey: string
}

export type SafetyComplianceIssueKind =
  | 'missing'
  | 'insufficient_quantity'
  | 'expired'
  | 'expiring_soon'
  | 'review_due'
  | 'review_due_soon'

/** Une ligne du panneau de conformité. */
export interface SafetyComplianceIssue {
  /** Exigence du corpus à l'origine de la ligne, `null` pour une échéance seule. */
  requirementKey: string | null
  equipmentType: string
  kind: SafetyComplianceIssueKind
  labelKey: string
  articleRef: string | null
  requiredQuantity: number | null
  currentQuantity: number | null
  /** Échéance ISO (`YYYY-MM-DD`) pour les lignes de péremption / révision. */
  dueDate: string | null
  /** Équipement concerné, `null` pour un équipement manquant. */
  itemId: number | null
  /** `declared` = date saisie par l'utilisateur, `default` = durée de vie du corpus. */
  dueDateSource: 'declared' | 'default' | null
}

/** Entrée du calcul : l'inventaire réduit à ce dont le corpus a besoin. */
export interface SafetyComplianceItemInput {
  id: number
  equipmentType: string
  quantity: number | null
  /** ISO `YYYY-MM-DD` ou `null`. */
  expiryDate: string | null
  /** ISO `YYYY-MM-DD` ou `null`. */
  purchasedAt: string | null
}

export interface SafetyComplianceInput {
  armamentZone: ArmamentZone | null
  maxPersons: number | null
  propulsionType: string | null
  items: SafetyComplianceItemInput[]
  /** Date de référence ISO (injectée par les tests), défaut = aujourd'hui. */
  today?: string
}

/**
 * Rapport de conformité — strictement **informatif** : rien dans l'app ne se
 * bloque sur son contenu.
 */
export interface SafetyComplianceReport {
  /** `null` → aucun contrôle n'a été fait (zone non renseignée). */
  zone: ArmamentZone | null
  /** Version datée du texte de référence (`DIVISION_240_TEXT_VERSION`). */
  textVersion: string
  maxPersons: number | null
  /** Nombre d'exigences applicables à la zone. */
  requirementCount: number
  /** Exigences satisfaites (présentes, en quantité suffisante, non périmées). */
  satisfiedCount: number
  /** `satisfiedCount / requirementCount` en pourcentage entier, `null` sans zone. */
  score: number | null
  issues: SafetyComplianceIssue[]
  /**
   * Éléments d'armement que le vocabulaire d'inventaire ne sait pas encore
   * représenter : affichés en note de bas de panneau, jamais comptés.
   */
  untrackedItemKeys: readonly string[]
}
