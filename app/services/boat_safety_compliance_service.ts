import type Boat from '#models/boat'
import {
  DIVISION_240_TEXT_VERSION,
  DIVISION_240_UNTRACKED_ITEMS,
  requirementsForZone,
} from '#shared/constants/safety/division240_content'
import { resolveEffectiveExpiry } from '#shared/helpers/safety_compliance'
import type {
  ArmamentZone,
  Division240Requirement,
  SafetyComplianceInput,
  SafetyComplianceIssue,
  SafetyComplianceIssueKind,
  SafetyComplianceItemInput,
  SafetyComplianceReport,
} from '#shared/types/safety'
import { ARMAMENT_ZONES } from '#shared/types/safety'
import { DateTime } from 'luxon'

/** Fenêtre « bientôt » (jours), alignée sur `NotificationScanService`. */
const DUE_SOON_WINDOW_DAYS = 30

/** Ordre d'affichage : ce qui manque d'abord, ce qui approche en dernier. */
const ISSUE_RANK: Readonly<Record<SafetyComplianceIssueKind, number>> = {
  missing: 0,
  insufficient_quantity: 1,
  expired: 2,
  review_due: 3,
  expiring_soon: 4,
  review_due_soon: 5,
}

/** Une échéance dépassée invalide l'exigence ; une échéance proche l'alerte seulement. */
const BLOCKING_KINDS: ReadonlySet<SafetyComplianceIssueKind> = new Set([
  'missing',
  'insufficient_quantity',
  'expired',
  'review_due',
])

/**
 * Conformité de l'armement de sécurité à la Division 240 (#582).
 *
 * Calcul **pur** : inventaire + zone d'armement + nombre de personnes → rapport.
 * Aucune requête, aucun effet de bord — la fiche bateau appelle
 * {@link forBoat} sur un bateau déjà chargé.
 *
 * Le rapport est **informatif** : aucun écran ne bloque une réservation ou une
 * sortie sur son contenu, et une zone non renseignée ne produit aucun contrôle
 * (comportement d'avant #582, strictement inchangé).
 */
export default class BoatSafetyComplianceService {
  /**
   * Rapport de conformité d'un bateau déjà chargé (relation `safetyEquipment`
   * préchargée).
   *
   * @param boat bateau avec son inventaire de sécurité
   * @param today date de référence ISO (tests), défaut = aujourd'hui
   */
  forBoat(boat: Boat, today?: string): SafetyComplianceReport {
    return this.buildReport({
      armamentZone: (boat.armamentZone as ArmamentZone | null) ?? null,
      maxPersons: boat.maxPersons,
      propulsionType: boat.propulsionType,
      items: boat.safetyEquipment.map((item) => ({
        id: item.id,
        equipmentType: item.equipmentType,
        quantity: item.quantity,
        expiryDate: item.expiryDate ? item.expiryDate.toISODate() : null,
        purchasedAt: item.purchasedAt ? item.purchasedAt.toISODate() : null,
      })),
      ...(today ? { today } : {}),
    })
  }

  /**
   * Confronte un inventaire au corpus Division 240.
   *
   * @param input zone déclarée, `maxPersons`, propulsion et inventaire
   * @returns le rapport : exigences applicables, écarts triés, score
   */
  buildReport(input: SafetyComplianceInput): SafetyComplianceReport {
    const zone = this.normalizeZone(input.armamentZone)

    const empty: SafetyComplianceReport = {
      zone,
      textVersion: DIVISION_240_TEXT_VERSION,
      maxPersons: input.maxPersons,
      requirementCount: 0,
      satisfiedCount: 0,
      score: null,
      issues: [],
      untrackedItemKeys: [],
    }

    // Zone non renseignée → aucun contrôle. C'est le cas de tous les bateaux
    // existants tant que leur programme de navigation n'est pas déclaré.
    if (!zone) return empty

    const today = this.referenceDate(input.today)
    const soon = today.plus({ days: DUE_SOON_WINDOW_DAYS })

    const requirements = requirementsForZone(zone).filter(
      (requirement) => !requirement.sailingOnly || this.isSailing(input.propulsionType)
    )
    const itemsByType = this.groupByType(input.items)

    const issues: SafetyComplianceIssue[] = []
    /** Types dont une échéance dépassée invalide l'exigence correspondante. */
    const overdueTypes = new Set<string>()

    // Passe 1 — échéances, sur tout l'inventaire (y compris les équipements que
    // la zone n'exige pas : un radeau périmé reste une information utile).
    for (const item of input.items) {
      const expiry = resolveEffectiveExpiry(item)
      if (!expiry || expiry.date > soon) continue

      const overdue = expiry.date < today
      const kind: SafetyComplianceIssueKind =
        expiry.kind === 'review'
          ? overdue
            ? 'review_due'
            : 'review_due_soon'
          : overdue
            ? 'expired'
            : 'expiring_soon'

      if (BLOCKING_KINDS.has(kind)) overdueTypes.add(item.equipmentType)

      issues.push({
        requirementKey: null,
        equipmentType: item.equipmentType,
        kind,
        labelKey: `boats.options.safetyEquipmentType.${item.equipmentType}`,
        articleRef: null,
        requiredQuantity: null,
        currentQuantity: null,
        dueDate: expiry.date.toISODate(),
        itemId: item.id,
        dueDateSource: expiry.source,
      })
    }

    // Passe 2 — exigences de la zone : absence et quantité.
    let satisfiedCount = 0
    for (const requirement of requirements) {
      const items = itemsByType.get(requirement.equipmentType) ?? []
      const required = this.requiredQuantity(requirement, input.maxPersons)

      if (items.length === 0) {
        issues.push(this.requirementIssue(requirement, 'missing', required, 0))
        continue
      }

      const current = items.reduce((total, item) => total + (item.quantity ?? 1), 0)
      if (current < required) {
        issues.push(this.requirementIssue(requirement, 'insufficient_quantity', required, current))
        continue
      }

      if (!overdueTypes.has(requirement.equipmentType)) satisfiedCount++
    }

    // Les lignes d'échéance portant un type exigé sont rattachées à l'exigence :
    // le panneau peut ainsi afficher la référence d'article sur ces lignes aussi.
    const requirementByType = new Map(requirements.map((req) => [req.equipmentType, req]))
    for (const issue of issues) {
      if (issue.requirementKey !== null) continue
      const requirement = requirementByType.get(issue.equipmentType)
      if (!requirement) continue
      issue.requirementKey = requirement.key
      issue.articleRef = requirement.articleRef
    }

    issues.sort(
      (a, b) =>
        ISSUE_RANK[a.kind] - ISSUE_RANK[b.kind] || a.equipmentType.localeCompare(b.equipmentType)
    )

    return {
      ...empty,
      requirementCount: requirements.length,
      satisfiedCount,
      score:
        requirements.length === 0 ? 100 : Math.round((satisfiedCount / requirements.length) * 100),
      issues,
      untrackedItemKeys: DIVISION_240_UNTRACKED_ITEMS,
    }
  }

  /** Ne retient qu'une zone du vocabulaire — une valeur inconnue vaut « non renseignée ». */
  private normalizeZone(value: string | null): ArmamentZone | null {
    if (!value) return null
    return ARMAMENT_ZONES.includes(value as ArmamentZone) ? (value as ArmamentZone) : null
  }

  private referenceDate(today?: string): DateTime {
    if (!today) return DateTime.now().startOf('day')
    const parsed = DateTime.fromISO(today, { zone: 'utc' })
    return parsed.isValid ? parsed.startOf('day') : DateTime.now().startOf('day')
  }

  /**
   * Harnais et longes ne concernent que les bateaux à voile. `catamaran` est
   * traité comme voilier : c'est ainsi qu'il est proposé dans le formulaire
   * (`PROPULSION_OPTIONS`), en face de `motorboat`.
   */
  private isSailing(propulsionType: string | null): boolean {
    return propulsionType === 'sailboat' || propulsionType === 'catamaran'
  }

  /**
   * Quantité exigée. `per_person` s'appuie sur `boats.max_persons` ; sans cette
   * valeur, on retombe sur 1 — on préfère sous-estimer plutôt qu'inventer un
   * équipage.
   */
  private requiredQuantity(requirement: Division240Requirement, maxPersons: number | null): number {
    if (requirement.quantity.kind === 'fixed') return requirement.quantity.value
    return maxPersons && maxPersons > 0 ? maxPersons : 1
  }

  private requirementIssue(
    requirement: Division240Requirement,
    kind: SafetyComplianceIssueKind,
    required: number,
    current: number
  ): SafetyComplianceIssue {
    return {
      requirementKey: requirement.key,
      equipmentType: requirement.equipmentType,
      kind,
      labelKey: requirement.labelKey,
      articleRef: requirement.articleRef,
      requiredQuantity: required,
      currentQuantity: current,
      dueDate: null,
      itemId: null,
      dueDateSource: null,
    }
  }

  private groupByType(
    items: SafetyComplianceItemInput[]
  ): Map<string, SafetyComplianceItemInput[]> {
    const byType = new Map<string, SafetyComplianceItemInput[]>()
    for (const item of items) {
      const bucket = byType.get(item.equipmentType)
      if (bucket) bucket.push(item)
      else byType.set(item.equipmentType, [item])
    }
    return byType
  }
}
