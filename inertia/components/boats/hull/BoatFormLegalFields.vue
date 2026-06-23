<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useBoatOptions } from '~/composables/use_boat_options'
import { useT } from '~/composables/use_t'

defineProps<{
  errors: Record<string, string | string[] | undefined>
}>()

const navigationCategory = defineModel<string>('navigationCategory', { required: true })
const maxPersons = defineModel<string>('maxPersons', { required: true })
const hullIdentificationNumber = defineModel<string>('hullIdentificationNumber', {
  required: true,
})
const francisationNumber = defineModel<string>('francisationNumber', { required: true })
const flagCountry = defineModel<string>('flagCountry', { required: true })

const { t } = useT()
const { navigationCategoryOptions } = useBoatOptions()
</script>

<template>
  <div class="space-y-4">
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
  </div>
</template>
