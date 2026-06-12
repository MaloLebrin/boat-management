<script setup lang="ts">
import { ref } from 'vue'
import { useForm, usePage } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '../../../../shared/types/simulator'

interface Props {
  open: boolean
  input: SimulatorBoatInput
  breakdown: SimulatorCostBreakdown
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()

const { t } = useT()
const page = usePage<{ locale?: string }>()

const submitted = ref(false)

const form = useForm({
  email: '',
  boatType: props.input.boatType,
  lengthM: props.input.lengthM,
  hullWear: props.input.hullWear,
  engineWear: props.input.engineWear,
  safetyWear: props.input.safetyWear,
  riggingWear: props.input.riggingWear,
  totalMin: props.breakdown.totalMin,
  totalMax: props.breakdown.totalMax,
  locale: page.props.locale ?? 'fr',
})

function submit() {
  form.post('/simulator/lead', {
    preserveScroll: true,
    onSuccess: () => {
      submitted.value = true
    },
  })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('simulator.exit_intent_title')"
    :subtitle="t('simulator.exit_intent_subtitle')"
    :close-label="t('common.close')"
    size="md"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="submitted" class="py-4 text-center text-sm text-mint-700">
      {{ t('simulator.cta_email_success') }}
    </div>
    <form v-else class="space-y-4" @submit.prevent="submit">
      <BaseInput
        type="email"
        name="email"
        :placeholder="t('simulator.cta_email_placeholder')"
        :model-value="form.email"
        :error="form.errors.email"
        @update:model-value="form.email = $event"
      />
      <BaseButton
        type="submit"
        variant="primary"
        size="md"
        class="w-full"
        :disabled="form.processing"
      >
        {{ t('simulator.cta_email_button') }}
      </BaseButton>
      <p class="text-center text-xs text-fg-subtle">
        {{ t('simulator.cta_email_rgpd') }}
      </p>
    </form>
  </BaseModal>
</template>
