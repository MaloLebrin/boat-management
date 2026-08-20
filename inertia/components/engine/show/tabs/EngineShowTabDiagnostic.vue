<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import DiagnosticProgress from '~/components/diagnostic/DiagnosticProgress.vue'
import DiagnosticResetButton from '~/components/diagnostic/DiagnosticResetButton.vue'
import DiagnosticStepList from '~/components/diagnostic/DiagnosticStepList.vue'
import { GLOBAL_CHECKLIST } from '#shared/constants/diagnostic/diagnostic_content'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  boatId: number
  engineId: number
  checkedStepKeys: string[]
  canManage: boolean
}>()

const checkedKeys = computed(() => new Set(props.checkedStepKeys))
const checkedCount = computed(
  () => GLOBAL_CHECKLIST.steps.filter((step) => checkedKeys.value.has(step.key)).length
)
</script>

<template>
  <BaseCard padded>
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-fg">{{ t('diagnostic.global.title') }}</h2>
        <p class="mt-1 text-sm text-fg-muted">{{ t('diagnostic.global.intro') }}</p>
      </div>
      <DiagnosticResetButton v-if="canManage" :boat-id="boatId" :engine-id="engineId" scope="all" />
    </div>

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
      <DiagnosticProgress :checked="checkedCount" :total="GLOBAL_CHECKLIST.steps.length" />
    </div>

    <div class="mt-4">
      <DiagnosticStepList
        :steps="GLOBAL_CHECKLIST.steps"
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
