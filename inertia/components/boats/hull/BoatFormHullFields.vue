<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useBoatOptions } from '~/composables/useBoatOptions'
import { useT } from '~/composables/useT'
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
const selectedPortId = ref<number | ''>('')
const selectedPontoonId = ref<number | ''>('')
const selectedMouillageId = ref<number | ''>('')
const spotId = ref<number | ''>('')

const portOptions = computed(() =>
  (props.ports ?? []).map((p) => ({ label: p.name, value: p.id }))
)

const pontoonOptions = computed(() => {
  if (!selectedPortId.value) return []
  const port = (props.ports ?? []).find((p) => p.id === selectedPortId.value)
  return port?.pontoons.map((pt) => ({ label: pt.name, value: pt.id })) ?? []
})

const mouillageOptions = computed(() => {
  if (!selectedPortId.value) return []
  const port = (props.ports ?? []).find((p) => p.id === selectedPortId.value)
  return port?.mouillages.map((m) => ({ label: m.name, value: m.id })) ?? []
})

const spotOptions = computed(() => {
  const port = (props.ports ?? []).find((p) => p.id === selectedPortId.value)
  if (selectedPontoonId.value) {
    const pt = port?.pontoons.find((p) => p.id === selectedPontoonId.value)
    return pt?.spots.map((s) => ({ label: s.name, value: s.id })) ?? []
  }
  if (selectedMouillageId.value) {
    const m = port?.mouillages.find((mo) => mo.id === selectedMouillageId.value)
    return m?.spots.map((s) => ({ label: s.name, value: s.id })) ?? []
  }
  return []
})

watch(selectedPortId, () => {
  selectedPontoonId.value = ''
  selectedMouillageId.value = ''
  spotId.value = ''
})

watch(selectedPontoonId, (val) => {
  if (val) {
    selectedMouillageId.value = ''
    spotId.value = ''
  }
})

watch(selectedMouillageId, (val) => {
  if (val) {
    selectedPontoonId.value = ''
    spotId.value = ''
  }
})

// TODO: this need to be refactored
function syncFromBoat() {
  if (props.mode !== 'edit' || !props.boat) return
  const b = props.boat
  name.value = b.name ?? ''
  registrationNumber.value = b.registrationNumber ?? ''
  type.value = b.type ?? ''
  manufacturedAt.value = b.manufacturedAt ? b.manufacturedAt.slice(0, 10) : ''
  lengthM.value = b.lengthM === null || b.lengthM === undefined ? '' : String(b.lengthM)
  beamM.value = b.beamM === null || b.beamM === undefined ? '' : String(b.beamM)
  draftM.value = b.draftM === null || b.draftM === undefined ? '' : String(b.draftM)
  mastHeightM.value = b.mastHeightM === null || b.mastHeightM === undefined ? '' : String(b.mastHeightM)
  hullMaterial.value = b.hullMaterial ?? ''
  yearBuilt.value = b.yearBuilt === null || b.yearBuilt === undefined ? '' : String(b.yearBuilt)
  manufacturer.value = b.manufacturer ?? ''
  model.value = b.model ?? ''
  homePort.value = b.homePort ?? ''
  navigationCategory.value = b.navigationCategory ?? ''
  hullIdentificationNumber.value = b.hullIdentificationNumber ?? ''
  francisationNumber.value = b.francisationNumber ?? ''
  flagCountry.value = b.flagCountry ?? ''
  maxPersons.value = b.maxPersons === null || b.maxPersons === undefined ? '' : String(b.maxPersons)
  spotId.value = b.spotId ?? ''
  // Find which port/pontoon/mouillage owns this spot
  if (b.spotId && props.ports) {
    for (const port of props.ports) {
      for (const pt of port.pontoons) {
        if (pt.spots.some((s) => s.id === b.spotId)) {
          selectedPortId.value = port.id
          selectedPontoonId.value = pt.id
          return
        }
      }
      for (const m of port.mouillages) {
        if (m.spots.some((s) => s.id === b.spotId)) {
          selectedPortId.value = port.id
          selectedMouillageId.value = m.id
          return
        }
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
    <BaseInput id="name" name="name" :label="t('boats.hullFields.name')" v-model="name" :errors="errors" />
    <BaseInput id="registrationNumber" name="registrationNumber" :label="t('boats.hullFields.registrationNumber')" v-model="registrationNumber" :errors="errors" />
    <BaseInput id="type" name="type" :label="t('boats.hullFields.type')" v-model="type" :errors="errors" />
    <BaseSelect id="propulsionType" name="propulsionType" :label="t('boats.hullFields.propulsionType')" placeholder="—" :allow-empty="true" :options="propulsionOptions" v-model="propulsionType" :errors="errors" />
    <BaseInput id="manufacturedAt" name="manufacturedAt" :label="t('boats.hullFields.manufacturedAt')" type="date" v-model="manufacturedAt" :errors="errors" />

    <div class="grid grid-cols-2 gap-4">
      <BaseInput id="lengthM" name="lengthM" :label="t('boats.hullFields.lengthM')" type="number" step="0.01" inputmode="decimal" v-model="lengthM" :errors="errors" />
      <BaseInput id="beamM" name="beamM" :label="t('boats.hullFields.beamM')" type="number" step="0.01" inputmode="decimal" v-model="beamM" :errors="errors" />
      <BaseInput id="draftM" name="draftM" :label="t('boats.hullFields.draftM')" type="number" step="0.01" inputmode="decimal" v-model="draftM" :errors="errors" />
      <BaseInput v-if="showMastHeight" id="mastHeightM" name="mastHeightM" :label="t('boats.hullFields.mastHeightM')" type="number" step="0.01" inputmode="decimal" v-model="mastHeightM" :errors="errors" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <BaseSelect id="hullMaterial" name="hullMaterial" :label="t('boats.hullFields.hullMaterial')" placeholder="—" :allow-empty="true" :options="hullMaterialOptions" v-model="hullMaterial" :errors="errors" />
      <BaseInput id="yearBuilt" name="yearBuilt" :label="t('boats.hullFields.yearBuilt')" type="number" inputmode="numeric" v-model="yearBuilt" :errors="errors" />
      <BaseInput id="manufacturer" name="manufacturer" :label="t('boats.hullFields.manufacturer')" v-model="manufacturer" :errors="errors" />
      <BaseInput id="model" name="model" :label="t('boats.hullFields.model')" v-model="model" :errors="errors" />
    </div>

    <BaseInput id="homePort" name="homePort" :label="t('boats.hullFields.homePort')" v-model="homePort" :errors="errors" />

    <div class="grid grid-cols-2 gap-4">
      <BaseSelect id="navigationCategory" name="navigationCategory" :label="t('boats.hullFields.navigationCategory')" placeholder="—" :allow-empty="true" :options="navigationCategoryOptions" v-model="navigationCategory" :errors="errors" />
      <BaseInput id="maxPersons" name="maxPersons" :label="t('boats.hullFields.maxPersons')" type="number" inputmode="numeric" v-model="maxPersons" :errors="errors" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <BaseInput id="hullIdentificationNumber" name="hullIdentificationNumber" :label="t('boats.hullFields.hullIdentificationNumber')" v-model="hullIdentificationNumber" :errors="errors" />
      <BaseInput id="francisationNumber" name="francisationNumber" :label="t('boats.hullFields.francisationNumber')" v-model="francisationNumber" :errors="errors" />
    </div>

    <BaseInput id="flagCountry" name="flagCountry" :label="t('boats.hullFields.flagCountry')" v-model="flagCountry" :errors="errors" />

    <!-- Current position section -->
    <div v-if="ports && ports.length > 0" class="space-y-4 rounded-lg border border-border p-4">
      <p class="text-sm font-semibold text-fg">{{ t('boats.show.position.title') }}</p>
      <BaseSelect
        id="portId"
        name="_portId"
        :label="t('ports.title')"
        :placeholder="t('common.selectPlaceholder')"
        :allow-empty="true"
        :options="portOptions"
        v-model="selectedPortId"
      />
      <div class="grid grid-cols-2 gap-4">
        <BaseSelect
          id="_pontoonId"
          name="_pontoonId"
          :label="t('boats.hullFields.pontoon')"
          :placeholder="t('common.selectPlaceholder')"
          :allow-empty="true"
          :options="pontoonOptions"
          :disabled="!selectedPortId || !!selectedMouillageId"
          v-model="selectedPontoonId"
        />
        <BaseSelect
          id="_mouillageId"
          name="_mouillageId"
          :label="t('boats.hullFields.mouillage')"
          :placeholder="t('common.selectPlaceholder')"
          :allow-empty="true"
          :options="mouillageOptions"
          :disabled="!selectedPortId || !!selectedPontoonId"
          v-model="selectedMouillageId"
        />
      </div>
      <BaseSelect
        v-if="selectedPontoonId || selectedMouillageId"
        id="spotId"
        name="spotId"
        :label="t('boats.hullFields.spotIdentifier')"
        :placeholder="t('common.selectPlaceholder')"
        :allow-empty="true"
        :options="spotOptions"
        v-model="spotId"
        :errors="errors"
      />
    </div>
  </div>
</template>
