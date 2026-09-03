<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import SparePartsAiEntryCard from '~/components/spare_parts/chat/SparePartsAiEntryCard.vue'
import SparePartsAssemblyGrid from '~/components/spare_parts/SparePartsAssemblyGrid.vue'
import SparePartsCartPanel from '~/components/spare_parts/SparePartsCartPanel.vue'
import SparePartsIdentitySection from '~/components/spare_parts/SparePartsIdentitySection.vue'
import SparePartsUnreferencedList from '~/components/spare_parts/SparePartsUnreferencedList.vue'
import type {
  EnginePlateHint,
  RepairCartItemRow,
  SparePartReferenceRow,
  SparePartsEngineProps,
} from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: SparePartsEngineProps
  /** Aides plaque servies par le catalogue moteur (#575). */
  plateHints: EnginePlateHint[]
  /** Références constructeur connues pour ce moteur (#575). */
  partReferences: SparePartReferenceRow[]
  cartItems: RepairCartItemRow[]
  canManage: boolean
}>()

const { t } = useT()

const breadcrumb = computed(() => [
  { label: t('parts.index.title'), href: '/spare-parts' },
  {
    label: engineDisplayTitle(t, props.engine),
    href: `/boats/${props.boat.id}/engines/${props.engine.id}`,
  },
  { label: t('parts.identify.title') },
])
</script>

<template>
  <Head :title="t('parts.identify.title')" />
  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumb" />

    <BaseHeading level="1">{{ t('parts.identify.title') }}</BaseHeading>
    <p class="mt-1 text-sm text-fg-muted">{{ engineDisplayTitle(t, engine) }} — {{ boat.name }}</p>
    <p class="mt-4 max-w-3xl text-sm text-fg-muted">{{ t('parts.identify.intro') }}</p>

    <div class="mt-6">
      <SparePartsIdentitySection
        :boat-id="boat.id"
        :engine="engine"
        :plate-hints="plateHints"
        :can-manage="canManage"
      />
    </div>

    <div class="mt-6">
      <SparePartsAiEntryCard :boat-id="boat.id" :engine-id="engine.id" />
    </div>

    <h2 class="mt-10 text-lg font-semibold text-fg">{{ t('parts.identify.assemblies.title') }}</h2>
    <p class="mt-1 max-w-3xl text-sm text-fg-muted">{{ t('parts.identify.assemblies.intro') }}</p>
    <div class="mt-4">
      <SparePartsAssemblyGrid :boat-id="boat.id" :engine-id="engine.id" :engine="engine" />
    </div>

    <div class="mt-10">
      <SparePartsUnreferencedList
        :cart-items="cartItems"
        :can-manage="canManage"
        :boat-id="boat.id"
        :engine-id="engine.id"
      />
    </div>

    <div class="mt-10">
      <SparePartsCartPanel
        :cart-items="cartItems"
        :references="partReferences"
        :can-manage="canManage"
        :boat-id="boat.id"
        :engine-id="engine.id"
      />
    </div>
  </div>
</template>
