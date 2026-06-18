<script setup lang="ts">
import { computed } from 'vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail } from '~/types/boat_show'
import type { MaintenanceTaskSubject } from '../../../../shared/types/maintenance'

const props = defineProps<{
  boat: BoatShowDetail
  subject: MaintenanceTaskSubject
  errors: Record<string, string>
}>()

const boatEngineId = defineModel<string>('boatEngineId', { default: '' })
const boatSailId = defineModel<string>('boatSailId', { default: '' })
const boatSafetyEquipmentId = defineModel<string>('boatSafetyEquipmentId', { default: '' })
const engineCaptionManual = defineModel<string>('engineCaptionManual', { default: '' })
const sailCaptionManual = defineModel<string>('sailCaptionManual', { default: '' })

const { t } = useT()

const engineOptions = computed(() =>
  props.boat.engines.map((e) => ({
    value: String(e.id),
    label: `${e.kind} · ${e.brand ?? ''} ${e.model ?? ''}`.trim(),
  }))
)

const sailOptions = computed(() =>
  props.boat.sails.map((s) => ({
    value: String(s.id),
    label: `${s.sailType}${s.areaM2 !== null ? ` · ${s.areaM2} m²` : ''}`,
  }))
)

const safetyOptions = computed(() =>
  props.boat.safetyEquipment.map((item) => ({
    value: String(item.id),
    label:
      t(`boats.options.safetyEquipmentType.${item.equipmentType}`) +
      (item.quantity !== null ? ` ×${item.quantity}` : ''),
  }))
)
</script>

<template>
  <template v-if="subject === 'engine'">
    <BaseSelect
      v-if="engineOptions.length"
      id="maint-engine"
      name="boatEngineId"
      :label="t('boats.maintenance.events.engine')"
      :placeholder="t('boats.maintenance.events.selectPlaceholder')"
      :allow-empty="true"
      :options="engineOptions"
      v-model="boatEngineId"
      :errors="errors"
    />
    <BaseInput
      id="maint-engine-caption"
      name="engineCaption"
      :label="t('boats.maintenance.events.label')"
      :placeholder="t('boats.maintenance.events.enginePlaceholder')"
      v-model="engineCaptionManual"
      :errors="errors"
    />
  </template>

  <template v-else-if="subject === 'sail'">
    <BaseSelect
      v-if="sailOptions.length"
      id="maint-sail"
      name="boatSailId"
      :label="t('boats.maintenance.events.sail')"
      :placeholder="t('boats.maintenance.events.selectPlaceholder')"
      :allow-empty="true"
      :options="sailOptions"
      v-model="boatSailId"
      :errors="errors"
    />
    <BaseInput
      id="maint-sail-caption"
      name="sailCaption"
      :label="t('boats.maintenance.events.label')"
      :placeholder="t('boats.maintenance.events.sailPlaceholder')"
      v-model="sailCaptionManual"
      :errors="errors"
    />
  </template>

  <template v-else-if="subject === 'rig'">
    <input v-if="boat.rig" type="hidden" name="boatRigId" :value="boat.rig.id" />
    <p v-if="!boat.rig" class="text-sm text-warning">
      {{ t('boats.maintenance.events.noRig') }}
    </p>
    <p v-if="errors.boatRigId" class="mt-1 text-xs font-medium text-danger">
      {{ errors.boatRigId }}
    </p>
  </template>

  <template v-else-if="subject === 'safety'">
    <BaseSelect
      v-if="safetyOptions.length"
      id="maint-safety"
      name="boatSafetyEquipmentId"
      :label="t('boats.maintenance.events.safetyEquipment')"
      :placeholder="t('boats.maintenance.events.selectPlaceholder')"
      :allow-empty="true"
      :options="safetyOptions"
      v-model="boatSafetyEquipmentId"
      :errors="errors"
    />
    <p v-else class="text-sm text-warning">
      {{ t('boats.maintenance.events.noSafety') }}
    </p>
  </template>
</template>
