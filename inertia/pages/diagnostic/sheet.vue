<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import DiagnosticResetButton from '~/components/diagnostic/DiagnosticResetButton.vue'
import DiagnosticSheetContent from '~/components/diagnostic/DiagnosticSheetContent.vue'
import { DIAGNOSTIC_SHEETS } from '#shared/constants/diagnostic/diagnostic_content'
import type { DiagnosticSheetSlug } from '#shared/types/diagnostic'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: { id: number; brand: string | null; model: string | null; kind: string; status: string }
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
        :checked-keys="checkedKeys"
        :can-manage="canManage"
        :boat-id="boat.id"
        :engine-id="engine.id"
      />
    </div>

    <Link
      :href="checklistHref"
      class="mt-8 inline-block text-sm font-medium text-brand hover:underline"
    >
      {{ t('diagnostic.common.backToChecklist') }}
    </Link>
  </div>
</template>
