<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import type { SimulatorBoatInput } from '../../../../shared/types/simulator'

interface Props {
  input: SimulatorBoatInput
  isAuthenticated: boolean
  canAddBoat: boolean
}

const props = defineProps<Props>()

const { t } = useT()

const showUpgradeModal = ref(false)

const boatTypeLabels: Record<string, string> = {
  motorboat: 'simulator.boat_type_motorboat',
  sailboat: 'simulator.boat_type_sailboat',
  catamaran: 'simulator.boat_type_catamaran',
  rib: 'simulator.boat_type_rib',
}

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
</script>

<template>
  <div class="mt-6 rounded-2xl border-2 border-coral-200 bg-coral-50 p-6 lg:p-8">
    <div class="text-center">
      <h3 class="font-display text-xl text-fg lg:text-2xl">
        <template v-if="isAuthenticated">
          {{ t('simulator.cta_add_boat_title', { type: t(boatTypeLabels[input.boatType]), length: String(input.lengthM) }) }}
        </template>
        <template v-else>
          {{ t('simulator.cta_title', { type: t(boatTypeLabels[input.boatType]), length: String(input.lengthM) }) }}
        </template>
      </h3>
      <p class="mt-2 text-sm text-fg-muted">
        {{ isAuthenticated ? t('simulator.cta_add_boat_subtitle') : t('simulator.cta_subtitle') }}
      </p>

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
  </div>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="boats" />
</template>
