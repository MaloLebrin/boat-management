<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import SparePartsReferenceSource from '~/components/spare_parts/SparePartsReferenceSource.vue'
import SparePartsRetailerLinks from '~/components/spare_parts/SparePartsRetailerLinks.vue'
import {
  SPARE_PART_ASSEMBLIES,
  SPARE_PART_CATALOG_INDEX,
} from '#shared/constants/spare_parts/spare_parts_content'
import type { PartSearchResult } from '#shared/types/spare_part_chat'
import type { SparePartsEngineProps } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'

/**
 * Résultat du chat de recherche de références (#634).
 *
 * Trois sorties, toutes honnêtes :
 * - référence connue → `SparePartsReferenceSource` (le seul endroit de l'app
 *   qui affiche une référence, toujours sourcée) + ajout au panier ;
 * - pièce identifiée sans référence → repli revendeurs de #517 ;
 * - aucune pièce du catalogue → renvoi vers l'identification manuelle.
 */
const props = defineProps<{
  boatId: number
  engine: SparePartsEngineProps
  result: PartSearchResult
  canManage: boolean
}>()

const { t } = useT()

const added = ref(false)
const adding = ref(false)

const entry = computed(() =>
  props.result.partKey ? (SPARE_PART_CATALOG_INDEX.get(props.result.partKey) ?? null) : null
)

const assembly = computed(() =>
  entry.value?.assemblySlug ? SPARE_PART_ASSEMBLIES[entry.value.assemblySlug] : null
)

const assemblyHref = computed(() =>
  assembly.value
    ? `/boats/${props.boatId}/engines/${props.engine.id}/spare-parts/assemblies/${assembly.value.slug}`
    : null
)

const identifyHref = computed(() => `/boats/${props.boatId}/engines/${props.engine.id}/spare-parts`)

function addToCart() {
  if (!props.result.partKey || adding.value || added.value) return
  adding.value = true
  router.post(
    `/boats/${props.boatId}/engines/${props.engine.id}/spare-parts/cart`,
    { partKey: props.result.partKey },
    {
      preserveScroll: true,
      onSuccess: () => {
        added.value = true
      },
      onFinish: () => {
        adding.value = false
      },
    }
  )
}
</script>

<template>
  <BaseCard padded>
    <template v-if="entry">
      <h3 class="text-lg font-semibold text-fg">{{ t('parts.ai.resultTitle') }}</h3>
      <p class="mt-1 text-sm text-fg">
        {{ t(entry.labelKey) }}
        <span v-if="entry.catalogName" class="text-fg-muted">— {{ entry.catalogName }}</span>
      </p>

      <template v-if="result.reference">
        <div class="mt-3">
          <SparePartsReferenceSource :reference="result.reference" />
        </div>
        <div v-if="canManage" class="mt-3">
          <BaseButton variant="primary" :disabled="adding || added" @click="addToCart">
            {{ added ? t('parts.ai.addedToCart') : t('parts.ai.addToCart') }}
          </BaseButton>
        </div>
      </template>

      <template v-else>
        <p class="mt-3 text-sm text-fg-muted">{{ t('parts.ai.resultNoReference') }}</p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <Link
            v-if="assemblyHref"
            :href="assemblyHref"
            class="text-sm font-medium text-brand hover:underline"
          >
            {{ t('parts.ai.viewAssembly') }}
          </Link>
          <BaseButton
            v-if="canManage"
            variant="outline"
            :disabled="adding || added"
            @click="addToCart"
          >
            {{ added ? t('parts.ai.addedToCart') : t('parts.ai.addToCart') }}
          </BaseButton>
        </div>
        <div class="mt-4">
          <SparePartsRetailerLinks
            :engine="engine"
            :catalog-label="assembly?.catalogLabel ?? entry.catalogName ?? ''"
          />
        </div>
      </template>
    </template>

    <template v-else>
      <h3 class="text-lg font-semibold text-fg">{{ t('parts.ai.resultTitle') }}</h3>
      <p class="mt-2 text-sm text-fg-muted">{{ t('parts.ai.resultNoMatch') }}</p>
      <Link
        :href="identifyHref"
        class="mt-3 inline-block text-sm font-medium text-brand hover:underline"
      >
        {{ t('parts.ai.manualFallbackCta') }}
      </Link>
    </template>
  </BaseCard>
</template>
