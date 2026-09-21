<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

/** Bloc assurance du formulaire d'incident : déclaration transmise + n° de sinistre. */
defineProps<{ error?: string }>()

const insuranceClaimed = defineModel<boolean>('insuranceClaimed', { required: true })
const insuranceClaimRef = defineModel<string>('insuranceClaimRef', { required: true })

const { t } = useT()
</script>

<template>
  <div class="sm:col-span-2 flex items-center gap-3">
    <input
      id="insuranceClaimed"
      v-model="insuranceClaimed"
      type="checkbox"
      name="insuranceClaimed"
      class="h-4 w-4 rounded border-border text-brand focus:ring-brand"
    />
    <label for="insuranceClaimed" class="text-sm text-fg">
      {{ t('incidents.fields.insuranceClaimed') }}
    </label>
  </div>

  <BaseInput
    v-model="insuranceClaimRef"
    type="text"
    id="insuranceClaimRef"
    name="insuranceClaimRef"
    class="sm:col-span-2"
    :label="t('incidents.fields.insuranceClaimRef')"
    :error="error"
  />
</template>
