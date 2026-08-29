<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCombobox, { type ComboboxOption } from '~/components/base/BaseCombobox.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { prefillInterval, useMaintenanceOperations } from '~/composables/use_maintenance_operations'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail } from '~/types/boat_show'
import { engineKindLabel, sailTypeLabel } from '~/utils/boat_enum_labels'
import type { MaintenanceSubject } from '#shared/constants/maintenance/maintenance_subjects'
import type { MaintenanceOperation } from '#shared/types/maintenance'

/**
 * Formulaire de création d'une tâche de maintenance planifiée.
 *
 * Le titre est une combobox alimentée par le catalogue d'opérations standard
 * (#581) : retenir une opération remplit le titre, aligne le sujet et complète
 * les intervalles de récurrence **encore vides**. Toute saisie libre reste
 * acceptée telle quelle — le catalogue assiste, il ne contraint pas.
 */
const props = defineProps<{ boat: BoatShowDetail }>()

const emit = defineEmits<{ (e: 'submitted'): void; (e: 'cancel'): void }>()

const { t } = useT()

const taskSubject = ref<MaintenanceSubject>('boat')
const taskBoatEngineId = ref('')
const taskBoatSailId = ref('')
const taskDueAt = ref('')
const taskRecurrenceMonths = ref('')
const taskDueEngineHours = ref('')
const taskRecurrenceEngineHours = ref('')
const taskTitle = ref('')
const taskNotes = ref('')

// Le validator accepte les 10 sujets depuis toujours, et l'onglet Tâches sait
// déjà tous les afficher : le formulaire s'aligne dessus (#581), sans quoi la
// moitié du catalogue (coque, sécurité, électricité…) resterait hors de portée
// d'une tâche planifiée.
const subjectOptions = computed<ReadonlyArray<{ label: string; value: MaintenanceSubject }>>(() => [
  { label: t('boats.maintenance.tasks.wholeBoat'), value: 'boat' },
  { label: t('boats.maintenance.tasks.hull'), value: 'hull' },
  { label: t('boats.maintenance.tasks.engine'), value: 'engine' },
  { label: t('boats.maintenance.tasks.sail'), value: 'sail' },
  { label: t('boats.maintenance.tasks.rig'), value: 'rig' },
  { label: t('boats.maintenance.tasks.electrical'), value: 'electrical' },
  { label: t('boats.maintenance.tasks.plumbing'), value: 'plumbing' },
  { label: t('boats.maintenance.tasks.safety'), value: 'safety' },
  { label: t('boats.maintenance.tasks.deck'), value: 'deck' },
  { label: t('boats.maintenance.tasks.other'), value: 'other' },
])

const engineOptions = computed(() =>
  props.boat.engines.map((e) => ({
    value: String(e.id),
    label: `${engineKindLabel(t, e.kind) ?? e.kind} · ${e.brand ?? ''} ${e.model ?? ''}`.trim(),
  }))
)

const sailOptions = computed(() =>
  props.boat.sails.map((s) => ({
    value: String(s.id),
    label: `${sailTypeLabel(t, s.sailType) ?? s.sailType}${s.areaM2 !== null ? ` · ${s.areaM2} m²` : ''}`,
  }))
)

const { operationOptions, findOperation } = useMaintenanceOperations(
  taskSubject,
  () => props.boat.engines
)

// Changer de sujet à la main repart d'un formulaire vierge. Le changement
// déclenché par une opération du catalogue, lui, ne doit rien effacer : il vient
// justement de remplir le titre et les intervalles.
let subjectChangedByCatalog = false

/** Dernière opération retenue, pour compléter les heures dès qu'un moteur est choisi. */
const selectedOperation = ref<MaintenanceOperation | null>(null)
/** Valeur d'heures posée par le catalogue — pour ne reprendre qu'elle, jamais une saisie. */
let catalogEngineHours: string | null = null

/**
 * Une récurrence en heures moteur exige `subject = engine` **et** un
 * `boatEngineId` côté service : pré-remplir les heures sans moteur retenu
 * fabriquerait un formulaire qui ne peut que se faire rejeter. On ne les remplit
 * donc qu'une fois le moteur connu — quitte à attendre que l'utilisateur le
 * choisisse.
 */
function prefillEngineHours() {
  const operation = selectedOperation.value
  if (!operation || taskBoatEngineId.value === '') return

  const next = prefillInterval(
    taskRecurrenceEngineHours.value,
    operation.defaultIntervalEngineHours
  )
  if (next === taskRecurrenceEngineHours.value) return

  taskRecurrenceEngineHours.value = next
  catalogEngineHours = next
}

function onOperationSelected(option: ComboboxOption) {
  const operation = findOperation(option.value)
  if (!operation) return

  selectedOperation.value = operation

  if (operation.subject !== taskSubject.value) {
    subjectChangedByCatalog = true
    taskSubject.value = operation.subject
  }

  taskRecurrenceMonths.value = prefillInterval(
    taskRecurrenceMonths.value,
    operation.defaultIntervalMonths
  )

  // Un bateau à moteur unique n'a rien à choisir : le retenir d'office évite un
  // aller-retour, sans jamais remplacer une sélection déjà faite.
  if (
    operation.subject === 'engine' &&
    taskBoatEngineId.value === '' &&
    props.boat.engines.length === 1
  ) {
    taskBoatEngineId.value = String(props.boat.engines[0].id)
  }

  prefillEngineHours()
}

// Le moteur retenu après coup débloque le pré-remplissage des heures ; le
// désélectionner reprend ce que le catalogue avait posé, pour ne pas laisser un
// formulaire invalide derrière soi.
watch(taskBoatEngineId, (engineId) => {
  if (engineId !== '') {
    prefillEngineHours()
    return
  }
  if (catalogEngineHours !== null && taskRecurrenceEngineHours.value === catalogEngineHours) {
    taskRecurrenceEngineHours.value = ''
  }
  catalogEngineHours = null
})

watch(taskSubject, () => {
  if (subjectChangedByCatalog) {
    subjectChangedByCatalog = false
    return
  }
  selectedOperation.value = null
  catalogEngineHours = null
  taskBoatEngineId.value = ''
  taskBoatSailId.value = ''
  taskDueEngineHours.value = ''
  taskRecurrenceEngineHours.value = ''
  taskTitle.value = ''
  taskNotes.value = ''
})
</script>

<template>
  <Form
    :action="{ url: `/boats/${boat.id}/maintenance-tasks`, method: 'post' }"
    @success="emit('submitted')"
    class="space-y-4"
    #default="{ processing, errors }"
  >
    <BaseSelect
      id="task-subject"
      name="subject"
      :label="t('boats.maintenance.tasks.subject')"
      :options="subjectOptions"
      v-model="taskSubject"
      :errors="errors"
    />

    <template v-if="taskSubject === 'engine'">
      <BaseSelect
        v-if="engineOptions.length"
        id="task-engine"
        name="boatEngineId"
        :label="t('boats.maintenance.tasks.engineLabel')"
        :placeholder="t('boats.maintenance.tasks.selectPlaceholder')"
        :allow-empty="true"
        :options="engineOptions"
        v-model="taskBoatEngineId"
        :errors="errors"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          id="task-due-hours"
          name="dueEngineHours"
          :label="t('boats.maintenance.tasks.dueEngineHours')"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          v-model="taskDueEngineHours"
          :errors="errors"
        />
        <BaseInput
          id="task-recur-hours"
          name="recurrenceIntervalEngineHours"
          :label="t('boats.maintenance.tasks.recurrenceEngineHours')"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          v-model="taskRecurrenceEngineHours"
          :errors="errors"
        />
      </div>
    </template>

    <template v-if="taskSubject === 'sail'">
      <BaseSelect
        v-if="sailOptions.length"
        id="task-sail"
        name="boatSailId"
        :label="t('boats.maintenance.tasks.sailLabel')"
        :placeholder="t('boats.maintenance.tasks.selectPlaceholder')"
        :allow-empty="true"
        :options="sailOptions"
        v-model="taskBoatSailId"
        :errors="errors"
      />
    </template>

    <template v-if="taskSubject === 'rig'">
      <input v-if="boat.rig" type="hidden" name="boatRigId" :value="boat.rig.id" />
      <p v-if="!boat.rig" class="text-sm text-warning">
        {{ t('boats.maintenance.tasks.noRig') }}
      </p>
      <p v-if="errors.boatRigId" class="mt-1 text-xs font-medium text-danger">
        {{ errors.boatRigId }}
      </p>
    </template>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        id="task-due-at"
        name="dueAt"
        :label="t('boats.maintenance.tasks.dueDate')"
        type="date"
        v-model="taskDueAt"
        :errors="errors"
      />
      <BaseInput
        id="task-recur-months"
        name="recurrenceIntervalMonths"
        :label="t('boats.maintenance.tasks.recurrenceMonths')"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        v-model="taskRecurrenceMonths"
        :errors="errors"
      />
    </div>

    <BaseCombobox
      id="task-title"
      name="title"
      :label="t('boats.maintenance.tasks.titleField')"
      required
      :placeholder="t('boats.maintenance.operations.placeholder')"
      :hint="t('boats.maintenance.operations.hint')"
      :empty-label="t('boats.maintenance.operations.noMatch')"
      :options="operationOptions"
      v-model="taskTitle"
      :errors="errors"
      @select="onOperationSelected"
    />

    <BaseTextarea
      id="task-notes"
      name="notes"
      :label="t('boats.maintenance.tasks.notes')"
      :rows="3"
      v-model="taskNotes"
      :errors="errors"
    />

    <div class="flex items-center justify-end gap-2 pt-2">
      <BaseButton variant="ghost" type="button" @click="emit('cancel')">
        {{ t('boats.maintenance.tasks.cancel') }}
      </BaseButton>
      <BaseButton type="submit" :disabled="processing || (taskSubject === 'rig' && !boat.rig)">
        {{ t('boats.maintenance.tasks.createTask') }}
      </BaseButton>
    </div>
  </Form>
</template>
