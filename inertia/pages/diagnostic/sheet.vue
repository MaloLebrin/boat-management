<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import DiagnosticResetButton from '~/components/diagnostic/DiagnosticResetButton.vue'
import DiagnosticSheetContent from '~/components/diagnostic/DiagnosticSheetContent.vue'
import { DIAGNOSTIC_SHEETS } from '#shared/constants/diagnostic/diagnostic_content'
import {
  DIAGNOSTIC_SHEET_TO_ASSEMBLY,
  SPARE_PART_ASSEMBLIES,
} from '#shared/constants/spare_parts/spare_parts_content'
import type { DiagnosticSheetSlug } from '#shared/types/diagnostic'
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
  sheetSlug: DiagnosticSheetSlug
  checkedStepKeys: string[]
  canManage: boolean
}>()

const { t } = useT()

const sheet = computed(() => DIAGNOSTIC_SHEETS[props.sheetSlug])
const checkedKeys = computed(() => new Set(props.checkedStepKeys))
const checklistHref = computed(
  () => `/boats/${props.boat.id}/engines/${props.engine.id}/diagnostic`
)

const breadcrumb = computed(() => [
  { label: t('diagnostic.index.title'), href: '/diagnostic' },
  { label: t('diagnostic.global.title'), href: checklistHref.value },
  { label: t(sheet.value.titleKey) },
])

/**
 * Lien croisé vers l'ensemble de pièces détachées concerné (#517) — un moteur
 * éligible au diagnostic l'est toujours à l'identification de pièces : les deux
 * parcours suivent la même famille de motorisation (#574, #576).
 */
const partsAssemblyLink = computed(() => {
  const assemblySlug = DIAGNOSTIC_SHEET_TO_ASSEMBLY[props.sheetSlug]
  if (!assemblySlug) return null
  const assembly = SPARE_PART_ASSEMBLIES[assemblySlug]
  return {
    href: `/boats/${props.boat.id}/engines/${props.engine.id}/spare-parts/assemblies/${assemblySlug}`,
    label: `${t(assembly.labelKey)} (${assembly.catalogLabel})`,
  }
})
</script>

<template>
  <Head :title="t(sheet.titleKey)" />
  <div class="w-full max-w-3xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumb" />

    <div class="flex items-start justify-between gap-4">
      <div>
        <BaseHeading level="1">{{ t(sheet.titleKey) }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">
          {{ engineDisplayTitle(t, engine) }} — {{ boat.name }}
        </p>
      </div>
      <DiagnosticResetButton
        v-if="canManage"
        :boat-id="boat.id"
        :engine-id="engine.id"
        :scope="sheetSlug"
      />
    </div>

    <div class="mt-6">
      <DiagnosticSheetContent
        :sheet="sheet"
        :family="engine.family"
        :checked-keys="checkedKeys"
        :can-manage="canManage"
        :boat-id="boat.id"
        :engine-id="engine.id"
      />
    </div>

    <Link
      v-if="partsAssemblyLink"
      :href="partsAssemblyLink.href"
      class="mt-6 inline-block text-sm font-medium text-brand hover:underline"
    >
      {{ t('parts.crossLinks.fromDiagnostic', { label: partsAssemblyLink.label }) }}
    </Link>

    <Link :href="checklistHref" class="mt-8 block text-sm font-medium text-brand hover:underline">
      {{ t('diagnostic.common.backToChecklist') }}
    </Link>
  </div>
</template>
