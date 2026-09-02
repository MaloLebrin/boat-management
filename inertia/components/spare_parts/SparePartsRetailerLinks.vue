<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { retailerLinksForBrand, sparePartsBrandFromCatalogSlug } from '#shared/helpers/spare_parts'
import { useT } from '~/composables/use_t'

/**
 * Clés i18n des libellés : l'app connectée (défaut, `parts.*`, vouvoiement)
 * et le chat public (#634 Phase 2, `publicPartSearch.retailers.*`, tutoiement)
 * partagent le composant sans partager leur ton.
 */
interface RetailerLinksKeys {
  title: string
  intro: string
  modelCodeHint: string
  modelCodeMissing: string
  opensNewTab: string
  sourceNote: string
}

const props = withDefaults(
  defineProps<{
    engine: { brand: string | null; model: string | null; catalogBrandSlug: string | null }
    catalogLabel: string
    keys?: RetailerLinksKeys
  }>(),
  {
    keys: () => ({
      title: 'parts.assembly.explodedTitle',
      intro: 'parts.assembly.explodedIntro',
      modelCodeHint: 'parts.assembly.modelCodeHint',
      modelCodeMissing: 'parts.assembly.modelCodeMissing',
      opensNewTab: 'parts.assembly.opensNewTab',
      sourceNote: 'parts.common.sourceNote',
    }),
  }
)

const { t } = useT()

// La marque est rapprochée du catalogue côté serveur (#573) ; il ne reste ici
// que la couverture du corpus pièces, qui retombe sur les liens génériques.
const retailers = computed(() =>
  retailerLinksForBrand(sparePartsBrandFromCatalogSlug(props.engine.catalogBrandSlug))
)
</script>

<template>
  <BaseCard padded>
    <h2 class="text-lg font-semibold text-fg">{{ t(keys.title) }}</h2>
    <p class="mt-1 text-sm text-fg-muted">
      {{ t(keys.intro, { catalogLabel }) }}
    </p>
    <p v-if="engine.model" class="mt-2 font-mono text-sm text-fg">
      {{ t(keys.modelCodeHint, { model: engine.model }) }}
    </p>
    <p v-else class="mt-2 text-sm text-warning">{{ t(keys.modelCodeMissing) }}</p>

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
          <span class="text-xs text-fg-muted">{{ t(keys.opensNewTab) }}</span>
        </a>
      </li>
    </ul>

    <p class="mt-4 text-xs text-fg-subtle">{{ t(keys.sourceNote) }}</p>
  </BaseCard>
</template>
