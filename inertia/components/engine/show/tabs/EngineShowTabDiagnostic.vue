<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import DiagnosticProgress from '~/components/diagnostic/DiagnosticProgress.vue'
import DiagnosticResetButton from '~/components/diagnostic/DiagnosticResetButton.vue'
import DiagnosticStepList from '~/components/diagnostic/DiagnosticStepList.vue'
import { globalChecklistForFamily } from '#shared/helpers/diagnostic'
import type { EngineFamily } from '#shared/types/engine_catalog'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  boatId: number
  engineId: number
  /** Famille du moteur (#576) : elle choisit la checklist globale servie. */
  family: EngineFamily | null
  checkedStepKeys: string[]
  canManage: boolean
}>()

const checkedKeys = computed(() => new Set(props.checkedStepKeys))
const checklist = computed(() => globalChecklistForFamily(props.family))
const checkedCount = computed(
  () => checklist.value?.steps.filter((step) => checkedKeys.value.has(step.key)).length ?? 0
)
</script>

<template>
  <BaseCard v-if="checklist" padded>
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-fg">{{ t(checklist.titleKey) }}</h2>
        <p class="mt-1 text-sm text-fg-muted">{{ t(checklist.introKey) }}</p>
      </div>
      <DiagnosticResetButton v-if="canManage" :boat-id="boatId" :engine-id="engineId" scope="all" />
    </div>

    <BaseAlert
      v-for="warningKey in checklist.warningKeys"
      :key="warningKey"
      variant="warning"
      :title="t(checklist.warningTitleKey)"
      class="mt-4"
    >
      {{ t(warningKey) }}
    </BaseAlert>

    <div class="mt-6">
      <DiagnosticProgress :checked="checkedCount" :total="checklist.steps.length" />
    </div>

    <div class="mt-4">
      <DiagnosticStepList
        :steps="checklist.steps"
        :checked-keys="checkedKeys"
        :can-manage="canManage"
        :boat-id="boatId"
        :engine-id="engineId"
      />
    </div>

    <Link
      :href="`/boats/${boatId}/engines/${engineId}/diagnostic`"
      class="mt-6 inline-block text-sm font-medium text-brand hover:underline"
    >
      {{ t('diagnostic.tab.openFull') }}
    </Link>
  </BaseCard>
</template>
