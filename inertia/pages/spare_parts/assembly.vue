<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import SparePartsCartPanel from '~/components/spare_parts/SparePartsCartPanel.vue'
import SparePartsPartList from '~/components/spare_parts/SparePartsPartList.vue'
import SparePartsRetailerLinks from '~/components/spare_parts/SparePartsRetailerLinks.vue'
import { DIAGNOSTIC_SHEETS } from '#shared/constants/diagnostic/diagnostic_content'
import { SPARE_PART_ASSEMBLIES } from '#shared/constants/spare_parts/spare_parts_content'
import { sparePartsBrandFromCatalogSlug, yamahaReferenceExample } from '#shared/helpers/spare_parts'
import type { PartAssemblySlug, RepairCartItemRow } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: {
    id: number
    brand: string | null
    model: string | null
    catalogBrandSlug: string | null
    serialNumber: string | null
    kind: string
    status: string
  }
  assemblySlug: PartAssemblySlug
  cartItems: RepairCartItemRow[]
  canManage: boolean
}>()

const { t } = useT()

const assembly = computed(() => SPARE_PART_ASSEMBLIES[props.assemblySlug])

const identifyHref = computed(
  () => `/boats/${props.boat.id}/engines/${props.engine.id}/spare-parts`
)

/** Carte « décoder une référence » : marque Yamaha + code fonction connu. */
const yamahaDecode = computed(() => {
  const code = assembly.value.yamahaFunctionCode
  if (!code || sparePartsBrandFromCatalogSlug(props.engine.catalogBrandSlug) !== 'yamaha')
    return null
  return { code, example: yamahaReferenceExample(props.engine.model, code) }
})

const diagnosticSheetLink = computed(() => {
  const slug = assembly.value.diagnosticSheet
  if (!slug) return null
  return {
    href: `/boats/${props.boat.id}/engines/${props.engine.id}/diagnostic/sheets/${slug}`,
    title: t(DIAGNOSTIC_SHEETS[slug].titleKey),
  }
})

const breadcrumb = computed(() => [
  { label: t('parts.index.title'), href: '/spare-parts' },
  { label: t('parts.identify.title'), href: identifyHref.value },
  { label: t(assembly.value.labelKey) },
])
</script>

<template>
  <Head :title="t(assembly.labelKey)" />
  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumb" />

    <BaseHeading level="1">{{ t(assembly.labelKey) }}</BaseHeading>
    <p class="mt-0.5 font-mono text-sm uppercase tracking-wide text-fg-muted">
      {{ assembly.catalogLabel }}
    </p>
    <p class="mt-1 text-sm text-fg-muted">{{ engineDisplayTitle(t, engine) }} — {{ boat.name }}</p>
    <p class="mt-4 max-w-3xl text-sm text-fg-muted">{{ t(assembly.descriptionKey) }}</p>

    <div class="mt-6">
      <SparePartsRetailerLinks :engine="engine" :catalog-label="assembly.catalogLabel" />
    </div>

    <div v-if="yamahaDecode" class="mt-6">
      <BaseCard padded>
        <h2 class="text-lg font-semibold text-fg">{{ t('parts.assembly.decode.title') }}</h2>
        <p class="mt-1 text-sm text-fg-muted">
          {{
            t('parts.assembly.decode.text', {
              example: yamahaDecode.example,
              code: yamahaDecode.code,
            })
          }}
        </p>
        <p class="mt-2 text-sm text-fg-muted">{{ t('parts.assembly.decode.searchHint') }}</p>
      </BaseCard>
    </div>

    <h2 class="mt-10 text-lg font-semibold text-fg">{{ t('parts.assembly.partsTitle') }}</h2>
    <p class="mt-1 max-w-3xl text-sm text-fg-muted">{{ t('parts.assembly.partsIntro') }}</p>
    <div class="mt-4">
      <SparePartsPartList
        :parts="assembly.parts"
        :cart-items="cartItems"
        :can-manage="canManage"
        :boat-id="boat.id"
        :engine-id="engine.id"
      />
    </div>

    <Link
      v-if="diagnosticSheetLink"
      :href="diagnosticSheetLink.href"
      class="mt-6 inline-block text-sm font-medium text-brand hover:underline"
    >
      {{ t('parts.assembly.diagnosticLink', { title: diagnosticSheetLink.title }) }}
    </Link>

    <div class="mt-10">
      <SparePartsCartPanel
        :cart-items="cartItems"
        :can-manage="canManage"
        :boat-id="boat.id"
        :engine-id="engine.id"
      />
    </div>

    <Link
      :href="identifyHref"
      class="mt-8 inline-block text-sm font-medium text-brand hover:underline"
    >
      {{ t('parts.common.backToIdentify') }}
    </Link>
  </div>
</template>
