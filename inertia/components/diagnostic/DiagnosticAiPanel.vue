<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { router, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { EngineDiagnosisMode, EngineDiagnosisPanelData } from '#shared/types/ai'
import { PLAN_LIMITS, type PlanTier } from '#shared/types/plan'

const props = defineProps<{
  boatId: number
  engineId: number
  aiDiagnosis: EngineDiagnosisPanelData | null
}>()

const { t } = useT()
const { formatDateTime } = useDateFormat()
const page = usePage()

const canUseAI = computed(() => {
  const plan = (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
  return PLAN_LIMITS[plan].canUseAI
})

const userText = ref('')
const isRefreshing = ref(false)
const showUpgradeModal = ref(false)

// Surface navy permanente (exception thème #457) : le panneau Assistant IA
// garde ses couleurs brutes dans les deux thèmes, comme BoatOverviewAiPanel.
function analyze(mode: EngineDiagnosisMode) {
  if (!canUseAI.value) {
    showUpgradeModal.value = true
    return
  }
  if (mode === 'symptoms' && userText.value.trim().length === 0) return

  isRefreshing.value = true
  router.post(
    `/ai/boats/${props.boatId}/engines/${props.engineId}/diagnosis`,
    mode === 'symptoms'
      ? { mode, symptoms: userText.value.trim() }
      : { mode, notes: userText.value.trim() || undefined },
    {
      preserveScroll: true,
      onFinish: () => {
        isRefreshing.value = false
      },
    }
  )
}

const recommendedSheetHref = computed(() => {
  if (!props.aiDiagnosis) return null
  const slug = props.aiDiagnosis.result.recommendedSheet
  // La fiche « premier contact » (achat d'occasion) vit sur sa page autonome.
  if (slug === 'first-contact') return '/diagnostic/first-contact'
  return `/boats/${props.boatId}/engines/${props.engineId}/diagnostic/sheets/${slug}`
})

const recommendedSheetTitle = computed(() => {
  if (!props.aiDiagnosis) return ''
  return t(`diagnostic.sheets.${props.aiDiagnosis.result.recommendedSheet.replace('-', '_')}.title`)
})
</script>

<template>
  <div class="rounded-xl bg-navy-800 p-4 text-white">
    <div class="mb-1 flex items-center justify-between gap-4">
      <p class="flex items-center gap-2 font-semibold">
        <span class="text-lg">&#10022;</span>
        {{ t('diagnostic.ai.title') }}
      </p>
      <p v-if="aiDiagnosis" class="text-xs text-navy-300">
        {{ t('diagnostic.ai.generatedAt', { date: formatDateTime(aiDiagnosis.createdAt) }) }}
      </p>
    </div>

    <!-- Disclaimer statique : jamais délégué à la génération IA -->
    <p class="mb-3 text-xs text-navy-300">{{ t('diagnostic.ai.disclaimer') }}</p>

    <template v-if="isRefreshing">
      <BaseSkeleton height-class="h-10" rounded-class="rounded-lg" class="mb-2 opacity-30" />
      <BaseSkeleton height-class="h-10" rounded-class="rounded-lg" class="mb-2 opacity-25" />
      <BaseSkeleton height-class="h-10" rounded-class="rounded-lg" class="opacity-20" />
    </template>
    <template v-else-if="aiDiagnosis">
      <div class="mb-2 rounded-lg bg-navy-700 px-3 py-2 text-sm">
        {{ aiDiagnosis.result.summary }}
      </div>

      <div class="mb-2 rounded-lg bg-navy-700 px-3 py-2 text-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-navy-300">
          {{ t('diagnostic.ai.recommendedSheet') }}
        </p>
        <Link
          v-if="recommendedSheetHref"
          :href="recommendedSheetHref"
          class="mt-1 inline-block font-medium underline underline-offset-2 hover:text-navy-100"
        >
          {{ recommendedSheetTitle }}
        </Link>
      </div>

      <div class="mb-2 rounded-lg bg-navy-700 px-3 py-2 text-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-navy-300">
          {{ t('diagnostic.ai.causesTitle') }}
        </p>
        <ol class="mt-1 list-decimal space-y-1 pl-5">
          <li v-for="(cause, i) in aiDiagnosis.result.causes" :key="i">{{ cause }}</li>
        </ol>
      </div>

      <div class="rounded-lg bg-navy-700 px-3 py-2 text-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-navy-300">
          {{ t('diagnostic.ai.nextStepTitle') }}
        </p>
        <p class="mt-1">{{ aiDiagnosis.result.nextStep }}</p>
      </div>
    </template>
    <template v-else>
      <p class="text-sm text-navy-300">{{ t('diagnostic.ai.empty') }}</p>
    </template>

    <div class="mt-4">
      <label class="sr-only" for="diagnostic-ai-text">{{ t('diagnostic.ai.inputLabel') }}</label>
      <textarea
        id="diagnostic-ai-text"
        v-model="userText"
        rows="3"
        maxlength="4000"
        :placeholder="t('diagnostic.ai.placeholder')"
        :disabled="isRefreshing"
        class="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white placeholder:text-navy-400 focus:border-navy-300 focus:outline-none disabled:opacity-50"
      ></textarea>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          class="min-h-11 rounded-lg bg-navy-600 px-4 py-2 text-sm font-medium hover:bg-navy-500 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isRefreshing || userText.trim().length === 0"
          @click="analyze('symptoms')"
        >
          {{ isRefreshing ? t('diagnostic.ai.analyzing') : t('diagnostic.ai.analyzeSymptoms') }}
        </button>
        <button
          type="button"
          class="min-h-11 rounded-lg border border-navy-500 px-4 py-2 text-sm font-medium hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isRefreshing"
          @click="analyze('progress')"
        >
          {{ t('diagnostic.ai.analyzeProgress') }}
        </button>
      </div>
    </div>
  </div>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="ai" />
</template>
