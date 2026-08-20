<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { ref } from 'vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import DiagnosticSheetContent from '~/components/diagnostic/DiagnosticSheetContent.vue'
import { DIAGNOSTIC_SHEETS } from '#shared/constants/diagnostic/diagnostic_content'
import { useT } from '~/composables/use_t'

const { t } = useT()

const sheet = DIAGNOSTIC_SHEETS['first-contact']

// État local uniquement : le moteur inspecté (achat d'occasion) n'existe pas
// en base, les cases repartent de zéro à chaque visite.
const checkedKeys = ref<Set<string>>(new Set())

function toggle(stepKey: string) {
  const next = new Set(checkedKeys.value)
  if (next.has(stepKey)) {
    next.delete(stepKey)
  } else {
    next.add(stepKey)
  }
  checkedKeys.value = next
}
</script>

<template>
  <Head :title="t(sheet.titleKey)" />
  <div class="w-full max-w-3xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('diagnostic.index.title'), href: '/diagnostic' },
        { label: t(sheet.titleKey) },
      ]"
    />

    <BaseHeading level="1">{{ t(sheet.titleKey) }}</BaseHeading>
    <p class="mt-2 text-sm text-fg-muted">{{ t('diagnostic.common.localStateHint') }}</p>

    <div class="mt-6">
      <DiagnosticSheetContent
        :sheet="sheet"
        :checked-keys="checkedKeys"
        :can-manage="true"
        mode="local"
        @toggle="toggle"
      />
    </div>

    <Link
      href="/diagnostic"
      class="mt-8 inline-block text-sm font-medium text-brand hover:underline"
    >
      {{ t('diagnostic.common.backToDiagnostic') }}
    </Link>
  </div>
</template>
