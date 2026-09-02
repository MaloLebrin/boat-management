<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import SparePartsReferenceSource from '~/components/spare_parts/SparePartsReferenceSource.vue'
import SparePartsRetailerLinks from '~/components/spare_parts/SparePartsRetailerLinks.vue'
import {
  SPARE_PART_ASSEMBLIES,
  SPARE_PART_CATALOG_INDEX,
} from '#shared/constants/spare_parts/spare_parts_content'
import type {
  PartSearchResult,
  PublicPartSearchConversationProps,
} from '#shared/types/spare_part_chat'

/**
 * Résultat du chat public de recherche de références (#634 Phase 2).
 *
 * Trois sorties, toutes honnêtes — comme la carte de l'app connectée, sans
 * panier ni liens `/boats/...` :
 * - référence connue → `SparePartsReferenceSource` (le seul endroit qui
 *   affiche une référence, toujours sourcée) ;
 * - pièce identifiée sans référence → repli revendeurs de #517 ;
 * - aucune pièce du catalogue → message de repli.
 * Un visiteur non connecté repart avec le CTA signup (`?from=parts`).
 */
const props = defineProps<{
  result: PartSearchResult
  engine: PublicPartSearchConversationProps['engine']
  isAuthenticated: boolean
}>()

const { t } = useT()

const RETAILER_KEYS = {
  title: 'publicPartSearch.retailers.title',
  intro: 'publicPartSearch.retailers.intro',
  modelCodeHint: 'publicPartSearch.retailers.modelCodeHint',
  modelCodeMissing: 'publicPartSearch.retailers.modelCodeMissing',
  opensNewTab: 'publicPartSearch.retailers.opensNewTab',
  sourceNote: 'publicPartSearch.retailers.sourceNote',
}

const entry = computed(() =>
  props.result.partKey ? (SPARE_PART_CATALOG_INDEX.get(props.result.partKey) ?? null) : null
)

const assembly = computed(() =>
  entry.value?.assemblySlug ? SPARE_PART_ASSEMBLIES[entry.value.assemblySlug] : null
)
</script>

<template>
  <BaseCard padded>
    <template v-if="entry">
      <h3 class="text-lg font-semibold text-fg">{{ t('publicPartSearch.result_title') }}</h3>
      <p class="mt-1 text-sm text-fg">
        {{ t(entry.labelKey) }}
        <span v-if="entry.catalogName" class="text-fg-muted">— {{ entry.catalogName }}</span>
      </p>

      <template v-if="result.reference">
        <div class="mt-3">
          <SparePartsReferenceSource
            :reference="result.reference"
            i18n-prefix="publicPartSearch.reference"
          />
        </div>
      </template>

      <template v-else>
        <p class="mt-3 text-sm text-fg-muted">{{ t('publicPartSearch.result_no_reference') }}</p>
        <div class="mt-4">
          <SparePartsRetailerLinks
            :engine="engine"
            :catalog-label="assembly?.catalogLabel ?? entry.catalogName ?? ''"
            :keys="RETAILER_KEYS"
          />
        </div>
      </template>
    </template>

    <template v-else>
      <h3 class="text-lg font-semibold text-fg">{{ t('publicPartSearch.result_title') }}</h3>
      <p class="mt-2 text-sm text-fg-muted">{{ t('publicPartSearch.result_no_match') }}</p>
    </template>

    <p class="mt-4 text-xs italic text-fg-muted">{{ t('publicPartSearch.result_disclaimer') }}</p>

    <div v-if="!isAuthenticated" class="mt-6 rounded-xl bg-brand-soft p-4 lg:p-5">
      <p class="font-display text-base text-fg">{{ t('publicPartSearch.result_cta_title') }}</p>
      <p class="mt-1.5 text-sm text-fg-muted">{{ t('publicPartSearch.result_cta_text') }}</p>
      <BaseButton href="/signup?from=parts" variant="primary" class="mt-4">
        {{ t('publicPartSearch.result_cta_button') }}
      </BaseButton>
    </div>
  </BaseCard>
</template>
