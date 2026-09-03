<script setup lang="ts">
import { computed, ref } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import { PLAN_LIMITS, type PlanTier } from '#shared/types/plan'
import type { SparePartsEngineRow } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

/**
 * Carte d'entrée du chat de recherche de références (#634).
 *
 * Deux modes : `engine` (page d'identification — moteur connu, lien direct) et
 * sélecteur (page index — l'utilisateur choisit un moteur de la flotte).
 * Même gating que les autres panneaux Assistant IA : plan sans IA →
 * `UpgradePlanModal`, aucune navigation.
 */
const props = defineProps<{
  /** Mode direct : moteur de la page courante. */
  boatId?: number
  engineId?: number
  /** Mode sélecteur : moteurs éligibles de la flotte. */
  engines?: SparePartsEngineRow[]
}>()

const { t } = useT()
const page = usePage()

const canUseAI = computed(() => {
  const plan = (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
  return PLAN_LIMITS[plan].canUseAI
})

const showUpgradeModal = ref(false)

const selectedEngineId = ref<number | null>(props.engines?.[0]?.id ?? null)

const targetUrl = computed(() => {
  if (props.boatId !== undefined && props.engineId !== undefined) {
    return `/boats/${props.boatId}/engines/${props.engineId}/spare-parts/chat`
  }
  const engine = props.engines?.find((row) => row.id === selectedEngineId.value)
  return engine ? `/boats/${engine.boatId}/engines/${engine.id}/spare-parts/chat` : null
})

// Surface navy permanente (exception thème #457) : le panneau Assistant IA
// garde ses couleurs brutes dans les deux thèmes, comme DiagnosticAiPanel.
function open() {
  if (!canUseAI.value) {
    showUpgradeModal.value = true
    return
  }
  if (targetUrl.value) router.visit(targetUrl.value)
}
</script>

<template>
  <div class="rounded-xl bg-navy-800 p-4 text-white">
    <p class="flex items-center gap-2 font-semibold">
      <span class="text-lg">&#10022;</span>
      {{ t('parts.ai.entryTitle') }}
    </p>
    <p class="mt-1 text-sm text-navy-300">{{ t('parts.ai.entryText') }}</p>

    <div v-if="engines !== undefined" class="mt-3">
      <label
        class="text-xs font-semibold uppercase tracking-wide text-navy-300"
        for="parts-ai-engine"
      >
        {{ t('parts.ai.entrySelectLabel') }}
      </label>
      <select
        id="parts-ai-engine"
        v-model="selectedEngineId"
        class="mt-1 w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-navy-300 focus:outline-none"
      >
        <option v-for="engine in engines" :key="engine.id" :value="engine.id">
          {{ engineDisplayTitle(t, engine) }} — {{ engine.boatName }}
        </option>
      </select>
    </div>

    <button
      type="button"
      class="mt-3 min-h-11 rounded-lg bg-navy-600 px-4 py-2 text-sm font-medium hover:bg-navy-500 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="targetUrl === null && canUseAI"
      @click="open"
    >
      {{ t('parts.ai.entryCta') }}
    </button>
  </div>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="ai" />
</template>
