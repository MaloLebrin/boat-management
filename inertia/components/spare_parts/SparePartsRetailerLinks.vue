<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { resolveSparePartsBrand, retailerLinksForBrand } from '#shared/helpers/spare_parts'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  engine: { brand: string | null; model: string | null }
  catalogLabel: string
}>()

const { t } = useT()

const retailers = computed(() => retailerLinksForBrand(resolveSparePartsBrand(props.engine.brand)))
</script>

<template>
  <BaseCard padded>
    <h2 class="text-lg font-semibold text-fg">{{ t('parts.assembly.explodedTitle') }}</h2>
    <p class="mt-1 text-sm text-fg-muted">
      {{ t('parts.assembly.explodedIntro', { catalogLabel }) }}
    </p>
    <p v-if="engine.model" class="mt-2 font-mono text-sm text-fg">
      {{ t('parts.assembly.modelCodeHint', { model: engine.model }) }}
    </p>
    <p v-else class="mt-2 text-sm text-warning">{{ t('parts.assembly.modelCodeMissing') }}</p>

    <ul class="mt-4 flex flex-wrap gap-3">
      <li v-for="retailer in retailers" :key="retailer.id">
        <!-- eslint-disable vue/no-restricted-v-bind -- lien externe (catalogue revendeur) ouvert dans un nouvel onglet : un <Link> Inertia intercepterait le clic -->
        <a
          :href="retailer.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-brand transition-colors hover:border-brand"
        >
          <!-- eslint-enable vue/no-restricted-v-bind -->
          {{ retailer.name }}
          <span class="text-xs text-fg-muted">{{ t('parts.assembly.opensNewTab') }}</span>
        </a>
      </li>
    </ul>

    <p class="mt-4 text-xs text-fg-subtle">{{ t('parts.common.sourceNote') }}</p>
  </BaseCard>
</template>
