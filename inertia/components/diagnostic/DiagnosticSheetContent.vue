<script setup lang="ts">
import BaseAlert from '~/components/base/BaseAlert.vue'
import DiagnosticStepList from '~/components/diagnostic/DiagnosticStepList.vue'
import DiagnosticTable from '~/components/diagnostic/DiagnosticTable.vue'
import type { DiagnosticSheet } from '#shared/types/diagnostic'
import { useT } from '~/composables/use_t'

const { t } = useT()

withDefaults(
  defineProps<{
    sheet: DiagnosticSheet
    checkedKeys: ReadonlySet<string>
    canManage: boolean
    mode?: 'persisted' | 'local'
    boatId?: number
    engineId?: number
  }>(),
  { mode: 'persisted', boatId: undefined, engineId: undefined }
)

const emit = defineEmits<{
  (e: 'toggle', stepKey: string): void
}>()
</script>

<template>
  <div class="space-y-6">
    <BaseAlert
      v-if="sheet.requiresRunningEngine"
      variant="warning"
      :title="t('diagnostic.common.neverDryTitle')"
    >
      {{ t('diagnostic.common.neverDry') }}
    </BaseAlert>

    <p v-if="sheet.introKey" class="text-sm text-fg-muted">{{ t(sheet.introKey) }}</p>

    <DiagnosticTable v-for="table in sheet.tables ?? []" :key="table.id" :table="table" />

    <section v-for="(section, index) in sheet.sections" :key="index" class="space-y-3">
      <h3 v-if="section.titleKey" class="text-sm font-semibold text-fg">
        {{ t(section.titleKey) }}
      </h3>
      <DiagnosticStepList
        :steps="section.steps"
        :checked-keys="checkedKeys"
        :can-manage="canManage"
        :mode="mode"
        :boat-id="boatId"
        :engine-id="engineId"
        @toggle="emit('toggle', $event)"
      />
    </section>

    <BaseAlert
      v-for="warningKey in sheet.warningKeys"
      :key="warningKey"
      variant="warning"
      :title="t('diagnostic.common.warningLabel')"
    >
      {{ t(warningKey) }}
    </BaseAlert>

    <div v-if="sheet.noteKeys?.length" class="space-y-2">
      <h3 class="text-sm font-semibold text-fg">{{ t('diagnostic.common.notesTitle') }}</h3>
      <p v-for="noteKey in sheet.noteKeys" :key="noteKey" class="text-sm italic text-fg-muted">
        {{ t(noteKey) }}
      </p>
    </div>
  </div>
</template>
