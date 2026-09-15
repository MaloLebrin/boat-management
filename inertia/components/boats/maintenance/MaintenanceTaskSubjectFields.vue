<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import { useTaskEquipmentOptions } from '~/composables/use_task_equipment_options'
import type { MaintenanceSubject } from '#shared/constants/maintenance/maintenance_subjects'
import { equipmentFieldName } from '#shared/helpers/maintenance_task_equipment'
import type { TaskEquipmentRef, TaskEquipmentSource } from '#shared/types/maintenance'

/**
 * Sujet et équipement visé d'une tâche. Libre : sélection du sujet puis de
 * l'équipement correspondant. Verrouillé (point d'entrée équipement) : une puce
 * en lecture seule et des champs cachés — seules les heures moteur restent saisissables.
 */
const props = defineProps<{
  equipment: TaskEquipmentSource
  errors: Record<string, string>
  lockedEquipment?: TaskEquipmentRef | null
}>()

const subject = defineModel<MaintenanceSubject>('subject', { required: true })
const engineId = defineModel<string>('engineId', { required: true })
const sailId = defineModel<string>('sailId', { required: true })
const safetyId = defineModel<string>('safetyId', { required: true })
const genericId = defineModel<string>('genericId', { required: true })
const dueEngineHours = defineModel<string>('dueEngineHours', { required: true })
const recurrenceEngineHours = defineModel<string>('recurrenceEngineHours', { required: true })

const { t } = useT()
const { engineOptions, sailOptions, safetyOptions, genericOptions, equipmentLabel } =
  useTaskEquipmentOptions(() => props.equipment)

// Le validator accepte les 10 sujets et l'onglet Tâches sait tous les afficher (#581).
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

// Une échéance doit dépasser le compteur : sinon la tâche naît en retard.
const selectedEngineHours = computed(() => {
  const locked = props.lockedEquipment
  const id = locked?.type === 'engine' ? locked.id : Number(engineId.value)
  return props.equipment.engines.find((engine) => engine.id === id)?.hours ?? null
})

const DEDICATED_SUBJECTS: ReadonlyArray<MaintenanceSubject> = ['engine', 'sail', 'rig', 'safety']
const showsGenericSelect = computed(
  () => !DEDICATED_SUBJECTS.includes(subject.value) && genericOptions.value.length > 0
)
</script>

<template>
  <div class="space-y-4">
    <div v-if="lockedEquipment" class="space-y-1">
      <input type="hidden" name="subject" :value="subject" />
      <input
        type="hidden"
        :name="equipmentFieldName(lockedEquipment.type)"
        :value="lockedEquipment.id"
      />
      <p class="text-sm font-medium text-fg">{{ t('boats.maintenance.tasks.equipmentField') }}</p>
      <span
        data-testid="task-locked-equipment"
        class="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm text-brand"
      >
        {{ t(`boats.maintenance.tasks.${subject === 'boat' ? 'wholeBoat' : subject}`) }}
        <span v-if="equipmentLabel(lockedEquipment)" aria-hidden="true">·</span>
        {{ equipmentLabel(lockedEquipment) }}
      </span>
    </div>

    <template v-else>
      <BaseSelect
        id="task-subject"
        name="subject"
        :label="t('boats.maintenance.tasks.subject')"
        :options="subjectOptions"
        v-model="subject"
        :errors="errors"
      />

      <BaseSelect
        v-if="subject === 'engine' && engineOptions.length"
        id="task-engine"
        name="boatEngineId"
        :label="t('boats.maintenance.tasks.engineLabel')"
        :placeholder="t('boats.maintenance.tasks.selectPlaceholder')"
        :allow-empty="true"
        :options="engineOptions"
        v-model="engineId"
        :errors="errors"
      />

      <BaseSelect
        v-if="subject === 'sail' && sailOptions.length"
        id="task-sail"
        name="boatSailId"
        :label="t('boats.maintenance.tasks.sailLabel')"
        :placeholder="t('boats.maintenance.tasks.selectPlaceholder')"
        :allow-empty="true"
        :options="sailOptions"
        v-model="sailId"
        :errors="errors"
      />

      <template v-if="subject === 'rig'">
        <input v-if="equipment.rig" type="hidden" name="boatRigId" :value="equipment.rig.id" />
        <p v-else class="text-sm text-warning">{{ t('boats.maintenance.tasks.noRig') }}</p>
        <p v-if="errors.boatRigId" class="mt-1 text-xs font-medium text-danger">
          {{ errors.boatRigId }}
        </p>
      </template>

      <BaseSelect
        v-if="subject === 'safety' && safetyOptions.length"
        id="task-safety"
        name="boatSafetyEquipmentId"
        :label="t('boats.maintenance.tasks.safetyLabel')"
        :placeholder="t('boats.maintenance.tasks.selectPlaceholder')"
        :allow-empty="true"
        :options="safetyOptions"
        v-model="safetyId"
        :errors="errors"
      />

      <BaseSelect
        v-if="showsGenericSelect"
        id="task-generic"
        name="boatGenericEquipmentId"
        :label="t('boats.maintenance.tasks.genericLabel')"
        :placeholder="t('boats.maintenance.tasks.selectPlaceholder')"
        :allow-empty="true"
        :options="genericOptions"
        v-model="genericId"
        :errors="errors"
      />
    </template>

    <div v-if="subject === 'engine'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        id="task-due-hours"
        name="dueEngineHours"
        :label="t('boats.maintenance.tasks.dueEngineHours')"
        :hint="
          selectedEngineHours === null
            ? undefined
            : t('boats.maintenance.tasks.currentEngineHoursHint', {
                hours: String(selectedEngineHours),
              })
        "
        type="number"
        inputmode="numeric"
        :min="String((selectedEngineHours ?? 0) + 1)"
        step="1"
        v-model="dueEngineHours"
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
        v-model="recurrenceEngineHours"
        :errors="errors"
      />
    </div>
  </div>
</template>
