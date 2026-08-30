<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { InspectionChecklistItem, InspectionItemState } from '#shared/types/inspection'
import type { BoatInspectionItemRow } from '~/types/inspection'

const props = defineProps<{
  boatId: number
  reservationId: number
  inspectionId: number
  item: InspectionChecklistItem
  /** Constat enregistré pour ce point, null = non contrôlé. */
  row: BoatInspectionItemRow | null
  /**
   * Constat du check-out pour le même point (#584). `undefined` = pas de
   * comparaison (panneau check-out), `null` = non contrôlé au départ.
   */
  counterpart?: BoatInspectionItemRow | null
  canEdit: boolean
  canManageActions: boolean
}>()

const emit = defineEmits<{
  (e: 'report-damage', prefill: { label: string; notes: string }): void
}>()

const { t } = useT()

const itemsUrl = computed(
  () =>
    `/boats/${props.boatId}/reservations/${props.reservationId}/inspections/${props.inspectionId}/items`
)

// Éditeur de note replié par défaut : `remark` et `damage` exigent une note,
// le tap « OK » n'en demande aucune (usage terrain, une main sur le ponton).
const editorState = ref<Exclude<InspectionItemState, 'ok'> | null>(null)
const noteDraft = ref('')

function tapOk() {
  if (!props.canEdit) return
  editorState.value = null
  if (props.row?.state === 'ok') {
    router.delete(itemsUrl.value, {
      data: { itemKey: props.item.key },
      preserveScroll: true,
    })
    return
  }
  router.patch(itemsUrl.value, { itemKey: props.item.key, state: 'ok' }, { preserveScroll: true })
}

function openEditor(state: Exclude<InspectionItemState, 'ok'>) {
  if (!props.canEdit) return
  editorState.value = state
  noteDraft.value = props.row?.note ?? ''
}

function saveNote() {
  if (!editorState.value || !noteDraft.value.trim()) return
  router.patch(
    itemsUrl.value,
    { itemKey: props.item.key, state: editorState.value, note: noteDraft.value.trim() },
    { preserveScroll: true, onSuccess: () => (editorState.value = null) }
  )
}

const STATE_RANK: Record<InspectionItemState, number> = { ok: 0, remark: 1, damage: 2 }

/** Le point s'est dégradé entre le départ et le retour — c'est ce qui doit sauter aux yeux. */
const degraded = computed(() => {
  if (!props.row || !props.counterpart) return false
  return STATE_RANK[props.row.state] > STATE_RANK[props.counterpart.state]
})

const checkoutStateLabel = computed(() => {
  if (props.counterpart === undefined) return null
  const state = props.counterpart?.state
  return t(`inspections.checklist.state.${state ?? 'notInspected'}`)
})

function stateButtonClass(state: InspectionItemState): string {
  const active = props.row?.state === state
  const activeClass = {
    ok: 'border-success text-success bg-surface-muted',
    remark: 'border-warning text-warning bg-surface-muted',
    damage: 'border-danger text-danger bg-surface-muted',
  }[state]
  return active ? activeClass : 'border-border text-fg-muted bg-surface-elevated'
}

function reportDamage() {
  emit('report-damage', { label: t(props.item.labelKey), notes: props.row?.note ?? '' })
}
</script>

<template>
  <li
    :class="[
      'rounded-lg border p-3',
      degraded ? 'border-danger/50 bg-surface-muted/40' : 'border-border bg-surface',
    ]"
  >
    <div class="flex flex-wrap items-center gap-2">
      <p class="min-w-0 flex-1 text-sm font-medium text-fg">{{ t(item.labelKey) }}</p>

      <!-- Cibles tactiles ≥ 44 px : la checklist se remplit au doigt sur le ponton (#481) -->
      <div class="flex gap-1" role="group">
        <button
          type="button"
          :disabled="!canEdit"
          :aria-pressed="row?.state === 'ok'"
          :title="row?.state === 'ok' ? t('inspections.checklist.uncheck') : undefined"
          :class="[
            'min-h-11 rounded-md border px-3 text-sm font-medium transition-colors',
            stateButtonClass('ok'),
            canEdit ? 'hover:border-success' : '',
          ]"
          @click="tapOk"
        >
          {{ t('inspections.checklist.state.ok') }}
        </button>
        <button
          type="button"
          :disabled="!canEdit"
          :aria-pressed="row?.state === 'remark'"
          :class="[
            'min-h-11 rounded-md border px-3 text-sm font-medium transition-colors',
            stateButtonClass('remark'),
            canEdit ? 'hover:border-warning' : '',
          ]"
          @click="openEditor('remark')"
        >
          {{ t('inspections.checklist.state.remark') }}
        </button>
        <button
          type="button"
          :disabled="!canEdit"
          :aria-pressed="row?.state === 'damage'"
          :class="[
            'min-h-11 rounded-md border px-3 text-sm font-medium transition-colors',
            stateButtonClass('damage'),
            canEdit ? 'hover:border-danger' : '',
          ]"
          @click="openEditor('damage')"
        >
          {{ t('inspections.checklist.state.damage') }}
        </button>
      </div>
    </div>

    <p v-if="row?.note && !editorState" class="mt-2 text-sm text-fg-muted">{{ row.note }}</p>

    <p
      v-if="checkoutStateLabel"
      :class="['mt-1 text-xs', degraded ? 'text-danger' : 'text-fg-subtle']"
    >
      {{ t('inspections.checklist.checkoutLabel', { state: checkoutStateLabel }) }}
      <template v-if="counterpart?.note"> — {{ counterpart.note }}</template>
      <span v-if="degraded" class="font-semibold">
        · {{ t('inspections.checklist.degraded') }}</span
      >
    </p>

    <div v-if="editorState" class="mt-3 space-y-2">
      <BaseTextarea
        :id="`note-${inspectionId}-${item.key}`"
        v-model="noteDraft"
        :name="`note-${item.key}`"
        :label="t('inspections.checklist.noteLabel')"
        :placeholder="t('inspections.checklist.notePlaceholder')"
        :rows="2"
      />
      <p v-if="!noteDraft.trim()" class="text-xs text-fg-subtle">
        {{ t('inspections.checklist.noteRequired') }}
      </p>
      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" size="sm" type="button" @click="editorState = null">
          {{ t('inspections.checklist.cancel') }}
        </BaseButton>
        <BaseButton size="sm" type="button" :disabled="!noteDraft.trim()" @click="saveNote">
          {{ t('inspections.checklist.save') }}
        </BaseButton>
      </div>
    </div>

    <div v-if="row?.state === 'damage' && canManageActions" class="mt-2">
      <BaseButton variant="ghost" size="sm" type="button" @click="reportDamage">
        {{ t('inspections.checklist.createAction') }}
      </BaseButton>
    </div>
  </li>
</template>
