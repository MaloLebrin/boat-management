import {
  MAINTENANCE_OPERATIONS,
  MAINTENANCE_OPERATION_INDEX,
} from '#shared/constants/maintenance/maintenance_operations'
import type { MaintenanceSubject } from '#shared/constants/maintenance/maintenance_subjects'
import type { MaintenanceEngineFamily, MaintenanceOperation } from '#shared/types/maintenance'

/**
 * Helpers purs du catalogue d'opérations de maintenance (#581) — partagés par
 * les formulaires Inertia et les tests d'invariants du corpus.
 */

/**
 * Famille moteur dérivée du couple `kind` / `fuel` de `boat_engines`.
 *
 * Repli assumé en attendant `ENGINE_FAMILIES` (#574). Renvoie `null` quand le
 * couple ne permet pas de trancher (`kind: 'other'`, carburant absent) : on ne
 * devine pas, et l'appelant s'abstient alors de filtrer.
 */
export function resolveEngineFamily(
  kind: string | null | undefined,
  fuel: string | null | undefined
): MaintenanceEngineFamily | null {
  if (kind === 'electric') return 'electric'
  if (kind === 'hybrid') return 'hybrid'
  if (fuel === 'electric') return 'electric'

  if (kind === 'inboard') {
    if (fuel === 'diesel') return 'inboard_diesel'
    if (fuel === 'essence') return 'inboard_petrol'
    return null
  }

  if (kind === 'outboard') {
    if (fuel === 'diesel') return 'outboard_diesel'
    if (fuel === 'essence') return 'outboard_petrol'
    return null
  }

  return null
}

/**
 * Vrai quand l'opération est cohérente avec au moins une des familles moteur
 * fournies. Une opération sans `families` concerne tous les moteurs, et une
 * liste de familles vide (aucun moteur, ou aucune famille identifiable) ne
 * filtre rien : mieux vaut proposer trop que masquer à tort.
 */
export function operationMatchesFamilies(
  operation: MaintenanceOperation,
  families: readonly MaintenanceEngineFamily[]
): boolean {
  if (!operation.families || families.length === 0) return true
  return families.some((family) => operation.families!.includes(family))
}

export interface ListOperationsOptions {
  /** Priorise les opérations de ce sujet — ne s'y limite jamais. */
  subject?: MaintenanceSubject | null
  /** Familles moteur du bateau ; vide = pas de filtrage. */
  engineFamilies?: readonly MaintenanceEngineFamily[]
}

/**
 * Opérations proposables, dans l'ordre d'affichage de la combobox.
 *
 * Le sujet **priorise** sans restreindre — même parti pris que le catalogue de
 * bateaux (#571) : retenir une opération d'un autre sujet reste possible, elle
 * met simplement le sujet du formulaire à jour. Les familles moteur, elles,
 * **écartent** vraiment : proposer « bougies » sur un diesel serait faux.
 */
export function listMaintenanceOperations(
  options: ListOperationsOptions = {}
): MaintenanceOperation[] {
  const families = options.engineFamilies ?? []
  const eligible = MAINTENANCE_OPERATIONS.filter((operation) =>
    operation.subject === 'engine' ? operationMatchesFamilies(operation, families) : true
  )

  const subject = options.subject
  if (!subject) return eligible

  return [
    ...eligible.filter((operation) => operation.subject === subject),
    ...eligible.filter((operation) => operation.subject !== subject),
  ]
}

export function findMaintenanceOperation(key: string): MaintenanceOperation | null {
  return MAINTENANCE_OPERATION_INDEX.get(key) ?? null
}
