<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

const lengthM = defineModel<string>('lengthM', { required: true })
const beamM = defineModel<string>('beamM', { required: true })
const draftM = defineModel<string>('draftM', { required: true })
const mastHeightM = defineModel<string>('mastHeightM', { required: true })

const props = defineProps<{
  showMastHeight: boolean
  errors: Record<string, string | string[] | undefined>
}>()

const { t } = useT()
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <BaseInput
      id="lengthM"
      name="lengthM"
      :label="t('boats.hullFields.lengthM')"
      type="number"
      step="0.01"
      inputmode="decimal"
      v-model="lengthM"
      :errors="errors"
    />
    <BaseInput
      id="beamM"
      name="beamM"
      :label="t('boats.hullFields.beamM')"
      type="number"
      step="0.01"
      inputmode="decimal"
      v-model="beamM"
      :errors="errors"
    />
    <BaseInput
      id="draftM"
      name="draftM"
      :label="t('boats.hullFields.draftM')"
      type="number"
      step="0.01"
      inputmode="decimal"
      v-model="draftM"
      :errors="errors"
    />
    <BaseInput
      v-if="props.showMastHeight"
      id="mastHeightM"
      name="mastHeightM"
      :label="t('boats.hullFields.mastHeightM')"
      type="number"
      step="0.01"
      inputmode="decimal"
      v-model="mastHeightM"
      :errors="errors"
    />
  </div>
</template>
