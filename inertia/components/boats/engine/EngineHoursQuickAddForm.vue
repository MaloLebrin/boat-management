<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  boatId: number
  engineId: number
}>()

const { t } = useT()
const isOpen = ref(false)
const hoursIncrement = ref('')
const processing = ref(false)

function submit() {
  const value = Number(hoursIncrement.value)
  if (!Number.isFinite(value) || value <= 0) return

  processing.value = true
  router.patch(
    `/boats/${props.boatId}/engines/${props.engineId}/hours`,
    { hoursIncrement: value },
    {
      preserveScroll: true,
      onFinish: () => {
        processing.value = false
        hoursIncrement.value = ''
        isOpen.value = false
      },
    }
  )
}
</script>

<template>
  <div class="inline-flex items-center gap-2">
    <BaseButton v-if="!isOpen" variant="ghost" size="sm" type="button" @click="isOpen = true">
      {{ t('boats.engines.addHours') }}
    </BaseButton>
    <form v-else class="flex items-center gap-2" @submit.prevent="submit">
      <BaseInput
        id="hoursIncrement"
        name="hoursIncrement"
        type="number"
        inputmode="numeric"
        min="1"
        step="1"
        :placeholder="t('boats.engines.addHoursPlaceholder')"
        v-model="hoursIncrement"
        class="w-28"
      />
      <BaseButton type="submit" size="sm" :disabled="processing">
        {{ t('boats.engines.addHoursSubmit') }}
      </BaseButton>
      <BaseButton variant="ghost" size="sm" type="button" @click="isOpen = false">
        {{ t('common.close') }}
      </BaseButton>
    </form>
  </div>
</template>
