<script setup lang="ts">
import BaseAlert from '~/components/base/BaseAlert.vue'
import DiagnosticStepList from '~/components/diagnostic/DiagnosticStepList.vue'
import DiagnosticTable from '~/components/diagnostic/DiagnosticTable.vue'
import { computed } from 'vue'
import { sectionsForFamily } from '#shared/helpers/diagnostic'
import type { DiagnosticSheet } from '#shared/types/diagnostic'
import type { EngineFamily } from '#shared/types/engine_catalog'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    sheet: DiagnosticSheet
    checkedKeys: ReadonlySet<string>
    canManage: boolean
    mode?: 'persisted' | 'local'
    boatId?: number
    engineId?: number
    /**
     * Famille du moteur (#576) : elle écarte les sections qui ne le concernent
     * pas sur les fiches élargies. `null` rend la fiche entière — la page
     * autonome « premier contact » n'a pas de moteur.
     */
    family?: EngineFamily | null
  }>(),
  { mode: 'persisted', boatId: undefined, engineId: undefined, family: null }
)

const sections = computed(() => sectionsForFamily(props.sheet, props.family))

/** Rappel de sécurité avant un essai moteur — hors-bord par défaut (#515). */
const runningEngineWarning = computed(
  () =>
    props.sheet.runningEngineWarning ?? {
      titleKey: 'diagnostic.common.neverDryTitle',
      textKey: 'diagnostic.common.neverDry',
    }
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
      :title="t(runningEngineWarning.titleKey)"
    >
      {{ t(runningEngineWarning.textKey) }}
    </BaseAlert>

    <p v-if="sheet.introKey" class="text-sm text-fg-muted">{{ t(sheet.introKey) }}</p>

    <DiagnosticTable v-for="table in sheet.tables ?? []" :key="table.id" :table="table" />

    <section v-for="(section, index) in sections" :key="index" class="space-y-3">
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
