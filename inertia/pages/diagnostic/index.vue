<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import DiagnosticProgress from '~/components/diagnostic/DiagnosticProgress.vue'
import DiagnosticTable from '~/components/diagnostic/DiagnosticTable.vue'
import { DIAGNOSTIC_TOOLS, GLOBAL_CHECKLIST } from '#shared/constants/diagnostic/diagnostic_content'
import type {
  DiagnosticEngineRow,
  DiagnosticTable as DiagnosticTableType,
} from '#shared/types/diagnostic'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

defineProps<{
  engines: DiagnosticEngineRow[]
}>()

const { t } = useT()

const totalSteps = GLOBAL_CHECKLIST.steps.length

const toolingTable: DiagnosticTableType = {
  id: 'tooling',
  headerKeys: [
    'diagnostic.tooling.headers.tool',
    'diagnostic.tooling.headers.usage',
    'diagnostic.tooling.headers.price',
  ],
  rowKeys: DIAGNOSTIC_TOOLS.map((tool) => [tool.nameKey, tool.usageKey, tool.priceKey]),
}
</script>

<template>
  <Head :title="t('diagnostic.index.title')" />
  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
    <BaseHeading level="1">{{ t('diagnostic.index.title') }}</BaseHeading>
    <p class="mt-2 max-w-3xl text-sm text-fg-muted">{{ t('diagnostic.index.subtitle') }}</p>

    <h2 class="mt-8 text-lg font-semibold text-fg">{{ t('diagnostic.index.enginesTitle') }}</h2>

    <div v-if="engines.length === 0" class="mt-4">
      <BaseCard padded>
        <div class="flex flex-col items-center justify-center py-10 text-center">
          <WrenchScrewdriverIcon class="h-12 w-12 text-fg-muted" />
          <p class="mt-4 text-lg font-semibold text-fg">{{ t('diagnostic.index.empty') }}</p>
          <p class="mt-2 max-w-xl text-sm text-fg-muted">
            {{ t('diagnostic.index.eligibilityHint') }}
          </p>
        </div>
      </BaseCard>
    </div>

    <div v-else class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Link
        v-for="engine in engines"
        :key="engine.id"
        :href="`/boats/${engine.boatId}/engines/${engine.id}/diagnostic`"
        class="group"
      >
        <BaseCard padded class="h-full transition-shadow hover:shadow-md">
          <h3 class="font-semibold text-fg group-hover:text-brand">
            {{ engineDisplayTitle(t, engine) }}
          </h3>
          <p class="mt-1 text-sm text-fg-muted">{{ engine.boatName }}</p>
          <div class="mt-4">
            <DiagnosticProgress :checked="engine.checkedCount" :total="totalSteps" />
          </div>
          <p class="mt-3 text-sm font-medium text-brand">
            {{ t('diagnostic.index.openChecklist') }}
          </p>
        </BaseCard>
      </Link>
    </div>

    <div class="mt-8">
      <BaseCard padded>
        <h2 class="text-lg font-semibold text-fg">
          {{ t('diagnostic.index.firstContactCard.title') }}
        </h2>
        <p class="mt-2 text-sm text-fg-muted">{{ t('diagnostic.index.firstContactCard.text') }}</p>
        <Link
          href="/diagnostic/first-contact"
          class="mt-3 inline-block text-sm font-medium text-brand hover:underline"
        >
          {{ t('diagnostic.index.firstContactCard.cta') }}
        </Link>
      </BaseCard>
    </div>

    <h2 class="mt-10 text-lg font-semibold text-fg">{{ t('diagnostic.tooling.title') }}</h2>
    <div class="mt-4">
      <DiagnosticTable :table="toolingTable" />
    </div>
  </div>
</template>
