<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import DiagnosticAiPanel from '~/components/diagnostic/DiagnosticAiPanel.vue'
import DiagnosticProgress from '~/components/diagnostic/DiagnosticProgress.vue'
import DiagnosticResetButton from '~/components/diagnostic/DiagnosticResetButton.vue'
import DiagnosticStepList from '~/components/diagnostic/DiagnosticStepList.vue'
import { GLOBAL_CHECKLIST } from '#shared/constants/diagnostic/diagnostic_content'
import type { EngineDiagnosisPanelData } from '#shared/types/ai'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: { id: number; brand: string | null; model: string | null; kind: string; status: string }
  checkedStepKeys: string[]
  canManage: boolean
  aiDiagnosis: EngineDiagnosisPanelData | null
}>()

const { t } = useT()

const checkedKeys = computed(() => new Set(props.checkedStepKeys))
const checkedCount = computed(
  () => GLOBAL_CHECKLIST.steps.filter((step) => checkedKeys.value.has(step.key)).length
)

const breadcrumb = computed(() => [
  { label: t('diagnostic.index.title'), href: '/diagnostic' },
  {
    label: engineDisplayTitle(t, props.engine),
    href: `/boats/${props.boat.id}/engines/${props.engine.id}`,
  },
  { label: t('diagnostic.global.title') },
])
</script>

<template>
  <Head :title="t('diagnostic.global.title')" />
  <div class="w-full max-w-3xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumb" />

    <div class="flex items-start justify-between gap-4">
      <div>
        <BaseHeading level="1">{{ t('diagnostic.global.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">
          {{ engineDisplayTitle(t, engine) }} — {{ boat.name }}
        </p>
      </div>
      <DiagnosticResetButton
        v-if="canManage"
        :boat-id="boat.id"
        :engine-id="engine.id"
        scope="all"
      />
    </div>

    <p class="mt-4 text-sm text-fg-muted">{{ t('diagnostic.global.intro') }}</p>

    <BaseAlert
      v-for="warningKey in GLOBAL_CHECKLIST.warningKeys"
      :key="warningKey"
      variant="warning"
      :title="t('diagnostic.common.neverDryTitle')"
      class="mt-4"
    >
      {{ t(warningKey) }}
    </BaseAlert>

    <div class="mt-6">
      <DiagnosticAiPanel :boat-id="boat.id" :engine-id="engine.id" :ai-diagnosis="aiDiagnosis" />
    </div>

    <div class="mt-6">
      <DiagnosticProgress :checked="checkedCount" :total="GLOBAL_CHECKLIST.steps.length" />
    </div>

    <div class="mt-4">
      <DiagnosticStepList
        :steps="GLOBAL_CHECKLIST.steps"
        :checked-keys="checkedKeys"
        :can-manage="canManage"
        :boat-id="boat.id"
        :engine-id="engine.id"
      />
    </div>
  </div>
</template>
