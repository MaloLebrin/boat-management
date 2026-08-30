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
import { globalChecklistForFamily } from '#shared/helpers/diagnostic'
import type { EngineDiagnosisPanelData } from '#shared/types/ai'
import type { EngineFamily } from '#shared/types/engine_catalog'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: {
    id: number
    brand: string | null
    model: string | null
    serialNumber: string | null
    kind: string
    family: EngineFamily | null
    status: string
  }
  checkedStepKeys: string[]
  canManage: boolean
  aiDiagnosis: EngineDiagnosisPanelData | null
}>()

const { t } = useT()

const checkedKeys = computed(() => new Set(props.checkedStepKeys))

/**
 * Checklist globale de la famille du moteur (#576) — hors-bord et in-bord n'ont
 * ni les mêmes étapes ni le même espace de clés. Le contrôleur ne sert cette
 * page qu'à un moteur éligible, qui a donc toujours une checklist.
 */
const checklist = computed(() => globalChecklistForFamily(props.engine.family))
const checkedCount = computed(
  () => checklist.value?.steps.filter((step) => checkedKeys.value.has(step.key)).length ?? 0
)
const title = computed(() => checklist.value?.titleKey ?? 'diagnostic.global.title')

const breadcrumb = computed(() => [
  { label: t('diagnostic.index.title'), href: '/diagnostic' },
  {
    label: engineDisplayTitle(t, props.engine),
    href: `/boats/${props.boat.id}/engines/${props.engine.id}`,
  },
  { label: t(title.value) },
])
</script>

<template>
  <Head :title="t(title)" />
  <div class="w-full max-w-3xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumb" />

    <div class="flex items-start justify-between gap-4">
      <div>
        <BaseHeading level="1">{{ t(title) }}</BaseHeading>
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

    <template v-if="checklist">
      <p class="mt-4 text-sm text-fg-muted">{{ t(checklist.introKey) }}</p>

      <BaseAlert
        v-for="warningKey in checklist.warningKeys"
        :key="warningKey"
        variant="warning"
        :title="t(checklist.warningTitleKey)"
        class="mt-4"
      >
        {{ t(warningKey) }}
      </BaseAlert>
    </template>

    <div class="mt-6">
      <DiagnosticAiPanel :boat-id="boat.id" :engine-id="engine.id" :ai-diagnosis="aiDiagnosis" />
    </div>

    <template v-if="checklist">
      <div class="mt-6">
        <DiagnosticProgress :checked="checkedCount" :total="checklist.steps.length" />
      </div>

      <div class="mt-4">
        <DiagnosticStepList
          :steps="checklist.steps"
          :checked-keys="checkedKeys"
          :can-manage="canManage"
          :boat-id="boat.id"
          :engine-id="engine.id"
        />
      </div>
    </template>
  </div>
</template>
