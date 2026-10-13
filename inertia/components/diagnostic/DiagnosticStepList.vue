<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { ref, watch } from 'vue'
import type { DiagnosticStep } from '#shared/types/diagnostic'
import { DIAGNOSTIC_SHEETS } from '#shared/constants/diagnostic/diagnostic_content'
import { TOGGLE_DIAGNOSTIC_STEP_ACTION } from '#shared/constants/offline_queue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const props = withDefaults(
  defineProps<{
    steps: readonly DiagnosticStep[]
    checkedKeys: ReadonlySet<string>
    canManage: boolean
    /**
     * `persisted` : le toggle est enregistré côté serveur (par moteur).
     * `local` : état local au navigateur (fiche achat d'occasion), le parent
     * gère le Set via l'événement `toggle`.
     */
    mode?: 'persisted' | 'local'
    boatId?: number
    engineId?: number
  }>(),
  { mode: 'persisted', boatId: undefined, engineId: undefined }
)

const emit = defineEmits<{
  (e: 'toggle', stepKey: string): void
}>()

/**
 * Hors-ligne (#981), `checkedKeys` (props Inertia) ne bouge pas : l'état
 * optimiste affiche le clic jusqu'à ce que le serveur le reflète, comme les
 * items de fiche d'entretien (#490).
 */
const optimisticChecked = ref<Record<string, boolean>>({})

watch(
  () => props.checkedKeys,
  (keys) => {
    for (const [key, checked] of Object.entries(optimisticChecked.value)) {
      if (keys.has(key) === checked) delete optimisticChecked.value[key]
    }
  }
)

function isChecked(step: DiagnosticStep): boolean {
  return optimisticChecked.value[step.key] ?? props.checkedKeys.has(step.key)
}

function toggleStep(step: DiagnosticStep) {
  if (!props.canManage) return
  if (props.mode === 'local') {
    emit('toggle', step.key)
    return
  }
  const url = `/boats/${props.boatId}/engines/${props.engineId}/diagnostic/steps`
  const payload = { stepKey: step.key, checked: !isChecked(step) }
  if (!isOnline.value) {
    optimisticChecked.value[step.key] = payload.checked
    // Une clé par étape : décocher puis recocher en mer ne rejoue que le dernier état.
    enqueue({
      type: TOGGLE_DIAGNOSTIC_STEP_ACTION,
      url,
      method: 'patch',
      payload,
      dedupeKey: `${TOGGLE_DIAGNOSTIC_STEP_ACTION}:${url}:${step.key}`,
    })
    return
  }
  router.patch(url, payload, { preserveScroll: true })
}

function sheetHref(step: DiagnosticStep): string {
  return `/boats/${props.boatId}/engines/${props.engineId}/diagnostic/sheets/${step.linkedSheet}`
}

function sheetTitle(step: DiagnosticStep): string {
  if (!step.linkedSheet) return ''
  return t(DIAGNOSTIC_SHEETS[step.linkedSheet].titleKey)
}
</script>

<template>
  <ol class="space-y-3">
    <li
      v-for="step in steps"
      :key="step.key"
      :class="[
        'rounded-lg border p-3 transition-colors',
        isChecked(step) ? 'border-border bg-surface-muted/30' : 'border-border bg-surface',
      ]"
    >
      <div class="flex items-start gap-3">
        <button
          type="button"
          :disabled="!canManage"
          :aria-pressed="isChecked(step)"
          :class="[
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            isChecked(step)
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-border bg-surface-elevated',
            canManage && !isChecked(step) ? 'hover:border-brand' : '',
          ]"
          @click="toggleStep(step)"
        >
          <svg
            v-if="isChecked(step)"
            class="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </button>

        <div class="flex-1 min-w-0">
          <p
            :class="[
              'text-sm font-medium',
              isChecked(step) ? 'text-fg-muted line-through' : 'text-fg',
            ]"
          >
            {{ t(step.labelKey) }}
          </p>
          <p v-if="step.detailKey" class="mt-1 text-sm text-fg-muted">
            {{ t(step.detailKey) }}
          </p>
          <Link
            v-if="step.linkedSheet && boatId !== undefined && engineId !== undefined"
            :href="sheetHref(step)"
            class="mt-1 inline-block text-sm font-medium text-brand hover:underline"
          >
            {{ t('diagnostic.common.sheetLink', { title: sheetTitle(step) }) }}
          </Link>
        </div>
      </div>
    </li>
  </ol>
</template>
