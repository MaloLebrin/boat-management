<script setup lang="ts">
import { ref } from 'vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import { useT } from '~/composables/use_t'

/** Corps du panneau pour les plans sans IA — même mécanique que `DashboardAiPanel`. */
const { t } = useT()

const showUpgradeModal = ref(false)
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
    <span class="text-2xl text-lilac-300" aria-hidden="true">&#10022;</span>
    <p class="text-sm font-semibold text-white">{{ t('assistant.upsell.title') }}</p>
    <p class="text-sm text-navy-200">{{ t('assistant.upsell.text') }}</p>
    <button
      type="button"
      class="mt-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:bg-white/90"
      @click="showUpgradeModal = true"
    >
      {{ t('assistant.upsell.cta') }}
    </button>
  </div>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="ai" />
</template>
