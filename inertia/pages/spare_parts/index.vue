<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { CogIcon } from '@heroicons/vue/24/outline'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import type { SparePartsEngineRow } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

defineProps<{
  engines: SparePartsEngineRow[]
}>()

const { t } = useT()

const stepKeys = [
  'parts.index.steps.identify',
  'parts.index.steps.assembly',
  'parts.index.steps.sheet',
  'parts.index.steps.order',
]
</script>

<template>
  <Head :title="t('parts.index.title')" />
  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
    <BaseHeading level="1">{{ t('parts.index.title') }}</BaseHeading>
    <p class="mt-2 max-w-3xl text-sm text-fg-muted">{{ t('parts.index.subtitle') }}</p>

    <div class="mt-6">
      <BaseCard padded>
        <h2 class="text-lg font-semibold text-fg">{{ t('parts.index.stepsTitle') }}</h2>
        <ol class="mt-3 space-y-2">
          <li v-for="(stepKey, index) in stepKeys" :key="stepKey" class="flex items-start gap-3">
            <span
              class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
            >
              {{ index + 1 }}
            </span>
            <p class="text-sm text-fg-muted">{{ t(stepKey) }}</p>
          </li>
        </ol>
      </BaseCard>
    </div>

    <h2 class="mt-8 text-lg font-semibold text-fg">{{ t('parts.index.enginesTitle') }}</h2>

    <div v-if="engines.length === 0" class="mt-4">
      <BaseCard padded>
        <div class="flex flex-col items-center justify-center py-10 text-center">
          <CogIcon class="h-12 w-12 text-fg-muted" />
          <p class="mt-4 text-lg font-semibold text-fg">{{ t('parts.index.empty') }}</p>
          <p class="mt-2 max-w-xl text-sm text-fg-muted">
            {{ t('parts.index.eligibilityHint') }}
          </p>
        </div>
      </BaseCard>
    </div>

    <div v-else class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Link
        v-for="engine in engines"
        :key="engine.id"
        :href="`/boats/${engine.boatId}/engines/${engine.id}/spare-parts`"
        class="group"
      >
        <BaseCard padded class="h-full transition-shadow hover:shadow-md">
          <h3 class="font-semibold text-fg group-hover:text-brand">
            {{ engineDisplayTitle(t, engine) }}
          </h3>
          <p class="mt-1 text-sm text-fg-muted">{{ engine.boatName }}</p>
          <p class="mt-1 text-sm text-fg-subtle">
            {{
              engine.family
                ? t(`boats.options.engineFamily.${engine.family}`)
                : t('parts.index.unknownFamily')
            }}
          </p>
          <p v-if="engine.cartCount > 0" class="mt-3 text-sm text-fg-muted">
            {{ t('parts.index.cartCount', { count: String(engine.cartCount) }) }}
          </p>
          <p class="mt-3 text-sm font-medium text-brand">
            {{ t('parts.index.openCatalog') }}
          </p>
        </BaseCard>
      </Link>
    </div>
  </div>
</template>
