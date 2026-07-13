<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  boatId: number
  engineId: number
  currentHours: number | null
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
  <BaseButton variant="ghost" size="sm" type="button" @click="isOpen = true">
    {{ t('boats.engines.addHours') }}
  </BaseButton>

  <BaseModal
    v-model:open="isOpen"
    :title="t('boats.engines.addHoursModalTitle')"
    :close-label="t('common.close')"
    size="md"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <p v-if="currentHours !== null" class="text-sm text-fg-muted">
        {{ t('boats.engines.addHoursCurrent', { hours: String(currentHours) }) }}
      </p>
      <BaseInput
        id="hoursIncrement"
        name="hoursIncrement"
        type="number"
        inputmode="numeric"
        min="1"
        step="1"
        :label="t('boats.engines.addHoursPlaceholder')"
        v-model="hoursIncrement"
      />
      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="isOpen = false">
          {{ t('boats.engines.modal.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="processing">
          {{ t('boats.engines.addHoursSubmit') }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
