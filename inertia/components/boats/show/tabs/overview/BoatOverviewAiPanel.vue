<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import { useT } from '~/composables/use_t'
import type { AiSuggestion } from '~/types/boat_show'
import { PLAN_LIMITS } from '../../../../../../shared/types/plan'
import type { PlanTier } from '../../../../../../shared/types/plan'

const props = defineProps<{
  boatId: number
  aiSuggestions: AiSuggestion[] | null
}>()

const { t } = useT()
const page = usePage()

const canUseAI = computed(() => {
  const plan = (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
  return PLAN_LIMITS[plan].canUseAI
})

const isRefreshing = ref(false)
const showUpgradeModal = ref(false)

function refreshSuggestions() {
  if (!canUseAI.value) {
    showUpgradeModal.value = true
    return
  }
  isRefreshing.value = true
  router.post(
    `/ai/boats/${props.boatId}/suggestions`,
    {},
    {
      preserveScroll: true,
      onFinish: () => {
        isRefreshing.value = false
      },
    }
  )
}
</script>

<template>
  <div class="rounded-xl bg-abyss-900 p-4 text-white">
    <div class="mb-3 flex items-center justify-between">
      <p class="flex items-center gap-2 font-semibold">
        <span class="text-lg">&#10022;</span>
        {{ t('boats.show.overview.aiTitle') }}
      </p>
      <button
        type="button"
        class="text-xs text-lagoon-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="isRefreshing"
        @click="refreshSuggestions"
      >
        {{
          isRefreshing ? t('boats.show.overview.aiRefreshing') : t('boats.show.overview.aiRefresh')
        }}
      </button>
    </div>

    <template v-if="isRefreshing">
      <BaseSkeleton height-class="h-10" rounded-class="rounded-lg" class="mb-2 opacity-30" />
      <BaseSkeleton height-class="h-10" rounded-class="rounded-lg" class="opacity-20" />
    </template>
    <template v-else-if="!aiSuggestions">
      <p class="text-sm text-abyss-400">{{ t('boats.show.overview.aiEmpty') }}</p>
    </template>
    <template v-else>
      <div
        v-for="(s, i) in aiSuggestions"
        :key="i"
        class="mb-2 rounded-lg bg-abyss-800 px-3 py-2 text-sm last:mb-0"
      >
        {{ s.text }}
      </div>
    </template>
  </div>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="ai" />
</template>
