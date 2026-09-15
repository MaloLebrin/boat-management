import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { ComboboxOption } from '~/components/base/BaseCombobox.vue'
import { prefillInterval, useMaintenanceOperations } from '~/composables/use_maintenance_operations'
import type { MaintenanceSubject } from '#shared/constants/maintenance/maintenance_subjects'
import { subjectForEquipment } from '#shared/helpers/maintenance_task_equipment'
import type {
  MaintenanceOperation,
  TaskEquipmentSource,
  TaskFormPrefill,
} from '#shared/types/maintenance'

interface TaskFormOptions {
  equipment: MaybeRefOrGetter<TaskEquipmentSource>
  prefill?: TaskFormPrefill | null
  /** Équipement figé : une opération du catalogue ne change jamais le sujet. */
  lockEquipment?: boolean
}

function initialSubject(source: TaskEquipmentSource, prefill?: TaskFormPrefill | null) {
  if (prefill?.subject) return prefill.subject
  const equipment = prefill?.equipment
  if (!equipment) return 'boat'
  const category =
    equipment.type === 'generic'
      ? source.genericEquipment.find((g) => g.id === equipment.id)?.category
      : null
  return subjectForEquipment(equipment.type, category)
}

function initialId(prefill: TaskFormPrefill | null | undefined, type: string) {
  return prefill?.equipment?.type === type ? String(prefill.equipment.id) : ''
}

/**
 * État du formulaire de tâche planifiée.
 *
 * Le titre est alimenté par le catalogue d'opérations standard (#581) : retenir
 * une opération remplit le titre, aligne le sujet et complète les intervalles de
 * récurrence **encore vides**. Toute saisie libre reste acceptée telle quelle.
 * Le pré-remplissage (point d'entrée équipement) n'est appliqué qu'au montage :
 * l'appelant remonte le formulaire (`:key`) pour un autre équipement.
 */
export function useMaintenanceTaskForm(options: TaskFormOptions) {
  const source = () => toValue(options.equipment)
  const prefill = options.prefill

  const subject = ref<MaintenanceSubject>(initialSubject(source(), prefill))
  const engineId = ref(initialId(prefill, 'engine'))
  const sailId = ref(initialId(prefill, 'sail'))
  const safetyId = ref(initialId(prefill, 'safety'))
  const genericId = ref(initialId(prefill, 'generic'))
  const dueAt = ref('')
  const recurrenceMonths = ref('')
  const dueEngineHours = ref('')
  const recurrenceEngineHours = ref('')
  const title = ref(prefill?.title ?? '')
  const notes = ref('')

  const { operationOptions, findOperation } = useMaintenanceOperations(
    subject,
    () => source().engines
  )

  // Changer de sujet à la main repart d'un formulaire vierge. Le changement
  // déclenché par une opération du catalogue, lui, ne doit rien effacer.
  let subjectChangedByCatalog = false

  /** Dernière opération retenue, pour compléter les heures dès qu'un moteur est choisi. */
  const selectedOperation = ref<MaintenanceOperation | null>(null)
  /** Valeur d'heures posée par le catalogue — pour ne reprendre qu'elle, jamais une saisie. */
  let catalogEngineHours: string | null = null

  /**
   * Une récurrence en heures moteur exige `subject = engine` **et** un moteur
   * côté service : on ne pré-remplit les heures qu'une fois le moteur connu.
   */
  function prefillEngineHours() {
    const operation = selectedOperation.value
    if (!operation || engineId.value === '') return

    const next = prefillInterval(recurrenceEngineHours.value, operation.defaultIntervalEngineHours)
    if (next === recurrenceEngineHours.value) return

    recurrenceEngineHours.value = next
    catalogEngineHours = next
  }

  function onOperationSelected(option: ComboboxOption) {
    const operation = findOperation(option.value)
    if (!operation) return

    selectedOperation.value = operation

    if (!options.lockEquipment && operation.subject !== subject.value) {
      subjectChangedByCatalog = true
      subject.value = operation.subject
    }

    recurrenceMonths.value = prefillInterval(
      recurrenceMonths.value,
      operation.defaultIntervalMonths
    )

    // Un bateau à moteur unique n'a rien à choisir : le retenir d'office évite un
    // aller-retour, sans jamais remplacer une sélection déjà faite.
    const engines = source().engines
    if (operation.subject === 'engine' && engineId.value === '' && engines.length === 1) {
      engineId.value = String(engines[0].id)
    }

    prefillEngineHours()
  }

  // Le moteur retenu après coup débloque le pré-remplissage des heures ; le
  // désélectionner reprend ce que le catalogue avait posé.
  watch(engineId, (id) => {
    if (id !== '') {
      prefillEngineHours()
      return
    }
    if (catalogEngineHours !== null && recurrenceEngineHours.value === catalogEngineHours) {
      recurrenceEngineHours.value = ''
    }
    catalogEngineHours = null
  })

  watch(subject, () => {
    if (subjectChangedByCatalog) {
      subjectChangedByCatalog = false
      return
    }
    selectedOperation.value = null
    catalogEngineHours = null
    engineId.value = ''
    sailId.value = ''
    safetyId.value = ''
    genericId.value = ''
    dueEngineHours.value = ''
    recurrenceEngineHours.value = ''
    title.value = ''
    notes.value = ''
  })

  return {
    subject,
    engineId,
    sailId,
    safetyId,
    genericId,
    dueAt,
    recurrenceMonths,
    dueEngineHours,
    recurrenceEngineHours,
    title,
    notes,
    operationOptions,
    onOperationSelected,
  }
}
