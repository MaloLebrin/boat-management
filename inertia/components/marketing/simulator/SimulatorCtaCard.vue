<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import type { SimulatorBoatInput } from '../../../../shared/types/simulator'

interface Props {
  input: SimulatorBoatInput
  isAuthenticated: boolean
}

const props = defineProps<Props>()

const { t } = useT()

const boatTypeLabels: Record<string, string> = {
  motorboat: 'marketing.simulator.boat_type_motorboat',
  sailboat: 'marketing.simulator.boat_type_sailboat',
  catamaran: 'marketing.simulator.boat_type_catamaran',
  rib: 'marketing.simulator.boat_type_rib',
}

function submit() {
  if (props.isAuthenticated) {
    router.post('/boats/from-simulator', props.input, { preserveScroll: false })
  } else {
    router.post('/simulator/session', props.input, { preserveScroll: false })
  }
}
</script>

<template>
  <div class="mt-6 rounded-2xl border-2 border-coral-200 bg-coral-50 p-6 lg:p-8">
    <div class="text-center">
      <h3 class="font-display text-xl text-fg lg:text-2xl">
        <template v-if="isAuthenticated">
          {{ t('marketing.simulator.cta_add_boat_title', { type: t(boatTypeLabels[input.boatType]), length: String(input.lengthM) }) }}
        </template>
        <template v-else>
          {{ t('marketing.simulator.cta_title', { type: t(boatTypeLabels[input.boatType]), length: String(input.lengthM) }) }}
        </template>
      </h3>
      <p class="mt-2 text-sm text-fg-muted">
        {{ isAuthenticated ? t('marketing.simulator.cta_add_boat_subtitle') : t('marketing.simulator.cta_subtitle') }}
      </p>

      <button
        type="button"
        class="mt-6 w-full rounded-xl bg-coral-500 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-coral-600"
        @click="submit"
      >
        {{ isAuthenticated ? t('marketing.simulator.cta_add_boat_button') : t('marketing.simulator.cta_button') }}
      </button>

      <p v-if="!isAuthenticated" class="mt-3 text-xs text-fg-subtle">
        {{ t('marketing.simulator.cta_free_mention') }}
      </p>
    </div>
  </div>
</template>
