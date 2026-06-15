<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BoatFormDimensionsFields from '~/components/boats/hull/BoatFormDimensionsFields.vue'
import BoatFormPositionFields from '~/components/boats/hull/BoatFormPositionFields.vue'
import { useBoatOptions } from '~/composables/use_boat_options'
import { useT } from '~/composables/use_t'
import type { BoatEditPayload, PortForForm, PropulsionTypeUi } from '~/types/boat_form'

const propulsionType = defineModel<PropulsionTypeUi>('propulsionType', { required: true })

const props = defineProps<{
  mode: 'create' | 'edit'
  boat?: BoatEditPayload
  showMastHeight: boolean
  errors: Record<string, string | string[] | undefined>
  ports?: PortForForm[]
}>()

const { t } = useT()
const { propulsionOptions, hullMaterialOptions, navigationCategoryOptions } = useBoatOptions()

const name = ref('')
const registrationNumber = ref('')
const type = ref('')
const manufacturedAt = ref('')
const lengthM = ref('')
const beamM = ref('')
const draftM = ref('')
const mastHeightM = ref('')
const hullMaterial = ref('')
const yearBuilt = ref('')
const manufacturer = ref('')
const model = ref('')
const homePort = ref('')
const navigationCategory = ref('')
const hullIdentificationNumber = ref('')
const francisationNumber = ref('')
const flagCountry = ref('')
const maxPersons = ref('')
const spotId = ref<number | ''>('')
const initialPortId = ref<number | undefined>(undefined)
const initialPontoonId = ref<number | undefined>(undefined)
const initialMouillageId = ref<number | undefined>(undefined)

function toStr(val: number | null | undefined): string {
  return val != null ? String(val) : ''
}

function syncFromBoat() {
  if (props.mode !== 'edit' || !props.boat) return
  const b = props.boat
  name.value = b.name ?? ''
  registrationNumber.value = b.registrationNumber ?? ''
  type.value = b.type ?? ''
  manufacturedAt.value = b.manufacturedAt ? b.manufacturedAt.slice(0, 10) : ''
  lengthM.value = toStr(b.lengthM)
  beamM.value = toStr(b.beamM)
  draftM.value = toStr(b.draftM)
  mastHeightM.value = toStr(b.mastHeightM)
  hullMaterial.value = b.hullMaterial ?? ''
  yearBuilt.value = toStr(b.yearBuilt)
  manufacturer.value = b.manufacturer ?? ''
  model.value = b.model ?? ''
  homePort.value = b.homePort ?? ''
  navigationCategory.value = b.navigationCategory ?? ''
  hullIdentificationNumber.value = b.hullIdentificationNumber ?? ''
  francisationNumber.value = b.francisationNumber ?? ''
  flagCountry.value = b.flagCountry ?? ''
  maxPersons.value = toStr(b.maxPersons)
  spotId.value = b.spotId ?? ''
  initialPortId.value = undefined
  initialPontoonId.value = undefined
  initialMouillageId.value = undefined
  if (!b.spotId || !props.ports) return
  for (const port of props.ports) {
    for (const pt of port.pontoons) {
      if (pt.spots.some((s) => s.id === b.spotId)) {
        initialPortId.value = port.id
        initialPontoonId.value = pt.id
        return
      }
    }
    for (const m of port.mouillages) {
      if (m.spots.some((s) => s.id === b.spotId)) {
        initialPortId.value = port.id
        initialMouillageId.value = m.id
        return
      }
    }
  }
}

watch(
  () => props.boat?.id,
  () => syncFromBoat(),
  { immediate: true }
)
</script>

<template>
  <div class="space-y-6">
    <BaseInput
      id="name"
      name="name"
      :label="t('boats.hullFields.name')"
      v-model="name"
      :errors="errors"
    />
    <BaseInput
      id="registrationNumber"
      name="registrationNumber"
      :label="t('boats.hullFields.registrationNumber')"
      v-model="registrationNumber"
      :errors="errors"
    />
    <BaseInput
      id="type"
      name="type"
      :label="t('boats.hullFields.type')"
      v-model="type"
      :errors="errors"
    />
    <BaseSelect
      id="propulsionType"
      name="propulsionType"
      :label="t('boats.hullFields.propulsionType')"
      :placeholder="t('boats.hullFields.selectPlaceholder')"
      :allow-empty="true"
      :options="propulsionOptions"
      v-model="propulsionType"
      :errors="errors"
    />
    <BaseInput
      id="manufacturedAt"
      name="manufacturedAt"
      :label="t('boats.hullFields.manufacturedAt')"
      type="date"
      v-model="manufacturedAt"
      :errors="errors"
    />

    <BoatFormDimensionsFields
      v-model:length-m="lengthM"
      v-model:beam-m="beamM"
      v-model:draft-m="draftM"
      v-model:mast-height-m="mastHeightM"
      :show-mast-height="showMastHeight"
      :errors="errors"
    />

    <div class="grid grid-cols-2 gap-4">
      <BaseSelect
        id="hullMaterial"
        name="hullMaterial"
        :label="t('boats.hullFields.hullMaterial')"
        :placeholder="t('boats.hullFields.selectPlaceholder')"
        :allow-empty="true"
        :options="hullMaterialOptions"
        v-model="hullMaterial"
        :errors="errors"
      />
      <BaseInput
        id="yearBuilt"
        name="yearBuilt"
        :label="t('boats.hullFields.yearBuilt')"
        type="number"
        inputmode="numeric"
        v-model="yearBuilt"
        :errors="errors"
      />
      <BaseInput
        id="manufacturer"
        name="manufacturer"
        :label="t('boats.hullFields.manufacturer')"
        v-model="manufacturer"
        :errors="errors"
      />
      <BaseInput
        id="model"
        name="model"
        :label="t('boats.hullFields.model')"
        v-model="model"
        :errors="errors"
      />
    </div>

    <BaseInput
      id="homePort"
      name="homePort"
      :label="t('boats.hullFields.homePort')"
      v-model="homePort"
      :errors="errors"
    />

    <div class="grid grid-cols-2 gap-4">
      <BaseSelect
        id="navigationCategory"
        name="navigationCategory"
        :label="t('boats.hullFields.navigationCategory')"
        :placeholder="t('boats.hullFields.selectPlaceholder')"
        :allow-empty="true"
        :options="navigationCategoryOptions"
        v-model="navigationCategory"
        :errors="errors"
      />
      <BaseInput
        id="maxPersons"
        name="maxPersons"
        :label="t('boats.hullFields.maxPersons')"
        type="number"
        inputmode="numeric"
        v-model="maxPersons"
        :errors="errors"
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <BaseInput
        id="hullIdentificationNumber"
        name="hullIdentificationNumber"
        :label="t('boats.hullFields.hullIdentificationNumber')"
        v-model="hullIdentificationNumber"
        :errors="errors"
      />
      <BaseInput
        id="francisationNumber"
        name="francisationNumber"
        :label="t('boats.hullFields.francisationNumber')"
        v-model="francisationNumber"
        :errors="errors"
      />
    </div>

    <BaseInput
      id="flagCountry"
      name="flagCountry"
      :label="t('boats.hullFields.flagCountry')"
      v-model="flagCountry"
      :errors="errors"
    />

    <BoatFormPositionFields
      v-if="ports"
      :key="`pos-${boat?.id ?? 'new'}`"
      :ports="ports"
      :errors="errors"
      :initial-port-id="initialPortId"
      :initial-pontoon-id="initialPontoonId"
      :initial-mouillage-id="initialMouillageId"
      v-model:spot-id="spotId"
    />
  </div>
</template>
