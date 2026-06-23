<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

defineProps<{
  errors: Record<string, string | string[] | undefined>
}>()

const mmsi = defineModel<string>('mmsi', { required: true })
const imoNumber = defineModel<string>('imoNumber', { required: true })

const { t } = useT()
</script>

<template>
  <div class="space-y-4 rounded-lg border border-border p-4">
    <p class="text-sm font-semibold text-fg">{{ t('boats.hullFields.aisSection') }}</p>
    <div class="grid grid-cols-2 gap-4">
      <BaseInput
        id="mmsi"
        name="mmsi"
        :label="t('boats.hullFields.mmsi')"
        inputmode="numeric"
        maxlength="9"
        v-model="mmsi"
        :errors="errors"
      />
      <BaseInput
        id="imoNumber"
        name="imoNumber"
        :label="t('boats.hullFields.imoNumber')"
        v-model="imoNumber"
        :errors="errors"
      />
    </div>
  </div>
</template>
