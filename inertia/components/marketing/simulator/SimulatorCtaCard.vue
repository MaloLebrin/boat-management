<script setup lang="ts">
import { ref } from 'vue'
import { router, useForm, usePage } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '../../../../shared/types/simulator'

interface Props {
  input: SimulatorBoatInput
  isAuthenticated: boolean
  canAddBoat: boolean
  breakdown: SimulatorCostBreakdown
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'email-submitted'): void }>()

const { t } = useT()
const page = usePage<{ locale?: string }>()

const showUpgradeModal = ref(false)
const emailSubmitted = ref(false)

const boatTypeLabels: Record<string, string> = {
  motorboat: 'simulator.boat_type_motorboat',
  sailboat: 'simulator.boat_type_sailboat',
  catamaran: 'simulator.boat_type_catamaran',
  rib: 'simulator.boat_type_rib',
}

const leadForm = useForm({
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
  if (props.isAuthenticated && !props.canAddBoat) {
    showUpgradeModal.value = true
    return
  }
  if (props.isAuthenticated) {
    router.post('/boats/from-simulator', props.input, { preserveScroll: false })
  } else {
    router.post('/simulator/session', props.input, { preserveScroll: false })
  }
}

function submitLead() {
  leadForm.post('/simulator/lead', {
    preserveScroll: true,
    onSuccess: () => {
      emailSubmitted.value = true
      emit('email-submitted')
    },
  })
}
</script>

<template>
  <div class="mt-6 rounded-2xl border-2 border-coral-200 bg-coral-50 p-6 lg:p-8">
    <div class="text-center">
      <h3 class="font-display text-xl text-fg lg:text-2xl">
        <template v-if="isAuthenticated">
          {{
            t('simulator.cta_add_boat_title', {
              type: t(boatTypeLabels[input.boatType]),
              length: String(input.lengthM),
            })
          }}
        </template>
        <template v-else>
          {{
            t('simulator.cta_title', {
              type: t(boatTypeLabels[input.boatType]),
              length: String(input.lengthM),
            })
          }}
        </template>
      </h3>
      <p class="mt-2 text-sm text-fg-muted">
        {{ isAuthenticated ? t('simulator.cta_add_boat_subtitle') : t('simulator.cta_subtitle') }}
      </p>

      <!-- CTA principal : coral intentionnel (hors design system app) -->
      <button
        type="button"
        class="mt-6 w-full rounded-xl bg-coral-500 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-coral-600"
        @click="submit"
      >
        {{ isAuthenticated ? t('simulator.cta_add_boat_button') : t('simulator.cta_button') }}
      </button>

      <p v-if="!isAuthenticated" class="mt-3 text-xs text-fg-subtle">
        {{ t('simulator.cta_free_mention') }}
      </p>
    </div>

    <template v-if="!isAuthenticated">
      <div class="my-6 flex items-center gap-3">
        <hr class="flex-1 border-coral-200" />
        <span class="text-xs text-fg-subtle">{{ t('simulator.cta_or_divider') }}</span>
        <hr class="flex-1 border-coral-200" />
      </div>

      <div v-if="emailSubmitted" class="text-center text-sm text-coral-700">
        {{ t('simulator.cta_email_success') }}
      </div>
      <div v-else>
        <p class="mb-3 text-center text-sm font-medium text-fg">
          {{ t('simulator.cta_email_title') }}
        </p>
        <form class="flex items-start gap-2" @submit.prevent="submitLead">
          <div class="min-w-0 flex-1">
            <BaseInput
              type="email"
              name="email"
              :placeholder="t('simulator.cta_email_placeholder')"
              :model-value="leadForm.email"
              :error="leadForm.errors.email"
              @update:model-value="leadForm.email = $event"
            />
          </div>
          <BaseButton type="submit" variant="secondary" size="md" :disabled="leadForm.processing">
            {{ t('simulator.cta_email_button') }}
          </BaseButton>
        </form>
        <p class="mt-2 text-center text-xs text-fg-subtle">
          {{ t('simulator.cta_email_rgpd') }}
        </p>
      </div>
    </template>
  </div>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="boats" />
</template>
