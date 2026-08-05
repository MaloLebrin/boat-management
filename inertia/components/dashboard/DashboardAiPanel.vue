<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import { useT } from '~/composables/use_t'
import type { AiSuggestion } from '~/types/boat_show'
import { PLAN_LIMITS } from '../../../shared/types/plan'
import type { PlanTier } from '../../../shared/types/plan'

defineProps<{ aiFleetAnalysis: AiSuggestion[] | null }>()

const { t } = useT()
const page = usePage()

const canUseAI = computed(() => {
  const plan = (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
  return PLAN_LIMITS[plan].canUseAI
})

const isAnalyzing = ref(false)
const showUpgradeModal = ref(false)

function analyzeFleet() {
  if (!canUseAI.value) {
    showUpgradeModal.value = true
    return
  }
  isAnalyzing.value = true
  router.post(
    '/ai/fleet-analysis',
    {},
    {
      preserveScroll: true,
      onFinish: () => {
        isAnalyzing.value = false
      },
    }
  )
}
</script>

<template>
  <!--
    Panneau navy permanent : c'est l'exception documentée dans CLAUDE.md, au même
    titre que la sidebar ou `BoatOverviewAiPanel`. Il tenait auparavant sur
    `bg-surface-inverse` / `text-fg-inverse`, deux tokens qui basculent *avec* le
    thème par construction (« inverse » = à contre-emploi du thème courant) : en
    sombre le panneau virait donc au blanc éclatant, seul bloc clair de la page
    (#457). Les paliers navy, eux, ne sont pas réinversés sous `[data-theme]` —
    ils tiennent dans les deux thèmes.
  -->
  <div class="rounded-xl bg-navy-800 p-5 text-white">
    <div class="mb-1 flex items-center gap-2">
      <span class="text-navy-300">&#10022;</span>
      <h3 class="text-base font-semibold">{{ t('dashboard.aiPanel.title') }}</h3>
    </div>
    <p class="mb-4 text-xs text-navy-300">{{ t('dashboard.aiPanel.suggestions') }}</p>

    <!-- Placeholders translucides plutôt que `BaseSkeleton` : celui-ci est bâti
         sur `bg-surface-muted`, invisible sur un aplat navy en thème sombre. -->
    <div v-if="isAnalyzing" class="mb-5 space-y-3" aria-hidden="true">
      <div class="h-14 animate-pulse rounded-lg bg-white/10" />
      <div class="h-14 animate-pulse rounded-lg bg-white/10" />
      <div class="h-10 animate-pulse rounded-lg bg-white/5" />
    </div>
    <div v-else-if="!aiFleetAnalysis" class="mb-5">
      <p class="text-sm text-navy-300">{{ t('dashboard.aiPanel.empty') }}</p>
    </div>
    <div v-else-if="aiFleetAnalysis.length === 0" class="mb-5">
      <p class="text-sm text-navy-300">{{ t('dashboard.aiPanel.noSuggestions') }}</p>
    </div>
    <div v-else class="mb-5 space-y-3">
      <div
        v-for="(s, i) in aiFleetAnalysis"
        :key="i"
        class="rounded-lg bg-navy-700 px-3 py-2 text-sm"
      >
        {{ s.text }}
      </div>
    </div>

    <!-- Bouton clair sur bandeau navy : même recette que les CTA marketing posés
         sur un aplat navy (`bg-white!` + `text-navy-900!`). Le variant `primary`
         y serait navy sur navy en thème clair. -->
    <BaseButton
      :disabled="isAnalyzing"
      class="w-full bg-white! text-navy-900! hover:bg-white/90!"
      @click="analyzeFleet"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      <span>{{
        isAnalyzing ? t('dashboard.aiPanel.analyzing') : t('dashboard.analyzeFleet')
      }}</span>
    </BaseButton>
  </div>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="ai" />
</template>
