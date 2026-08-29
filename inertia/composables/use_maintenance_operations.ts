import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { ComboboxOption } from '~/components/base/BaseCombobox.vue'
import { useT } from '~/composables/use_t'
import type { MaintenanceSubject } from '#shared/constants/maintenance/maintenance_subjects'
import {
  findMaintenanceOperation,
  listMaintenanceOperations,
  resolveEngineFamily,
} from '#shared/helpers/maintenance_operations'
import type { MaintenanceEngineFamily, MaintenanceOperation } from '#shared/types/maintenance'

/** Le minimum dont le catalogue a besoin pour écarter une opération moteur. */
export interface EngineFamilySource {
  kind: string
  fuel: string | null
}

/**
 * Suggestions du catalogue d'opérations standard (#581) pour le champ titre
 * d'une tâche ou d'un événement de maintenance.
 *
 * Le catalogue **assiste, il ne contraint pas** : la combobox ne fait que
 * remplir le champ, toute saisie libre part telle quelle au serveur. Retenir
 * une opération met le sujet à jour et pré-remplit les intervalles de
 * récurrence encore vides — jamais ceux déjà saisis.
 */
export function useMaintenanceOperations(
  subject: MaybeRefOrGetter<MaintenanceSubject>,
  engines: MaybeRefOrGetter<ReadonlyArray<EngineFamilySource>>
) {
  const { t } = useT()

  /**
   * Familles moteur du bateau. Un moteur dont le couple `kind`/`fuel` ne permet
   * pas de trancher est ignoré : il ne doit pas restreindre la liste, mais il ne
   * doit pas non plus rouvrir les opérations que les autres moteurs excluent.
   */
  const engineFamilies = computed<MaintenanceEngineFamily[]>(() => {
    const families = toValue(engines)
      .map((engine) => resolveEngineFamily(engine.kind, engine.fuel))
      .filter((family): family is MaintenanceEngineFamily => family !== null)
    return [...new Set(families)]
  })

  /** Rappel de périodicité affiché sous le libellé, jamais à la place. */
  function intervalHint(operation: MaintenanceOperation): string | undefined {
    const bits: string[] = []
    if (operation.defaultIntervalMonths !== undefined) {
      bits.push(
        t('boats.maintenance.operations.intervalMonths', {
          count: String(operation.defaultIntervalMonths),
        })
      )
    }
    if (operation.defaultIntervalEngineHours !== undefined) {
      bits.push(
        t('boats.maintenance.operations.intervalEngineHours', {
          count: String(operation.defaultIntervalEngineHours),
        })
      )
    }
    return bits.length ? bits.join(' · ') : undefined
  }

  const operationOptions = computed<ComboboxOption[]>(() =>
    listMaintenanceOperations({
      subject: toValue(subject),
      engineFamilies: engineFamilies.value,
    }).map((operation) => {
      const interval = intervalHint(operation)
      const subjectLabel = t(`maintenance.history.subjects.${operation.subject}`)
      return {
        value: operation.key,
        label: t(operation.labelKey),
        hint: interval ? `${subjectLabel} · ${interval}` : subjectLabel,
      }
    })
  )

  return { operationOptions, engineFamilies, findOperation: findMaintenanceOperation }
}

/**
 * Applique une opération retenue à un champ de récurrence : ne remplit que
 * lorsque la valeur courante est vide, pour ne jamais écraser une saisie.
 */
export function prefillInterval(current: string, months: number | undefined): string {
  if (current.trim() !== '') return current
  return months === undefined ? current : String(months)
}
