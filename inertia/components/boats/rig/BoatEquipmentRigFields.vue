<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import { useBoatOptions } from '~/composables/use_boat_options'
import { RIG_TYPE_OPTIONS } from '#shared/constants/boats/boat_form_options'

export type BoatEquipmentRigFieldsModel = {
  rigType: string
  manufacturedAt: string | null
  mastCount: number | null
  spreaders: number | null
  status: 'operational' | 'in_maintenance' | 'out_of_service' | 'retired'
  notes: string | null
}

const props = defineProps<{
  errors: Record<string, string | string[] | undefined>
  rig?: BoatEquipmentRigFieldsModel | null
}>()

const { t } = useT()
const { rigTypeOptions } = useBoatOptions()

const statusOptions = computed(() => [
  { value: 'operational', label: t('equipment.status.operational') },
  { value: 'in_maintenance', label: t('equipment.status.in_maintenance') },
  { value: 'out_of_service', label: t('equipment.status.out_of_service') },
  { value: 'retired', label: t('equipment.status.retired') },
])

const rigType = ref('')
const manufacturedAt = ref('')
const mastCount = ref('')
const spreaders = ref('')
const status = ref('')
const notes = ref('')

function syncFromProps() {
  const r = props.rig
  rigType.value = r?.rigType ?? RIG_TYPE_OPTIONS[0]?.value ?? 'sloop'
  manufacturedAt.value = r?.manufacturedAt ? r.manufacturedAt.slice(0, 10) : ''
  mastCount.value = r?.mastCount === null || r?.mastCount === undefined ? '' : String(r.mastCount)
  spreaders.value = r?.spreaders === null || r?.spreaders === undefined ? '' : String(r.spreaders)
  status.value = r?.status ?? 'operational'
  notes.value = r?.notes ?? ''
}

watch(
  () => props.rig,
  () => syncFromProps(),
  { immediate: true }
)
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <BaseSelect
      id="rigType"
      name="rigType"
      :label="t('boats.rig.fields.rigType')"
      :options="rigTypeOptions"
      v-model="rigType"
      :errors="errors"
    />

    <BaseInput
      id="manufacturedAt"
      name="manufacturedAt"
      :label="t('boats.rig.fields.manufacturedAt')"
      type="date"
      v-model="manufacturedAt"
      :errors="errors"
    />

    <BaseInput
      id="mastCount"
      name="mastCount"
      :label="t('boats.rig.fields.mastCount')"
      type="number"
      inputmode="numeric"
      v-model="mastCount"
      :errors="errors"
    />

    <BaseInput
      id="spreaders"
      name="spreaders"
      :label="t('boats.rig.fields.spreaders')"
      type="number"
      inputmode="numeric"
      v-model="spreaders"
      :errors="errors"
    />

    <BaseSelect
      id="status"
      name="status"
      :label="t('equipment.status.label')"
      :options="statusOptions"
      v-model="status"
      :errors="errors"
    />

    <div class="col-span-2">
      <BaseTextarea
        id="notes"
        name="notes"
        :label="t('boats.equipment.notes.label')"
        :placeholder="t('boats.equipment.notes.placeholder')"
        :rows="4"
        v-model="notes"
        :errors="errors"
      />
    </div>
  </div>
</template>
