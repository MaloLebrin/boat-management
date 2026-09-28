<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseDropdown from '~/components/base/BaseDropdown.vue'
import { useT } from '~/composables/use_t'
import { todayDateInputValue } from '~/utils/local_datetime'
import { POSTPONE_PRESETS, postponedDueDate, type PostponePreset } from '~/utils/task_postpone'

// Report en un clic (#867) : +1 semaine, +1 mois ou une date libre. Envoie un
// PATCH avec la seule échéance — le serveur compte le report et le journalise
// en `maintenance_task.postpone`. Réservé aux tâches datées : une échéance en
// heures moteur se décale depuis la modale d'édition.
const props = defineProps<{
  boatId: number
  taskId: number
  dueAt: string
}>()

const { t } = useT()

const customDate = ref('')
const processing = ref(false)

const menuItemClass =
  'w-full rounded-(--radius-control) px-3 py-2 text-left text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg'

function submit(dueAt: string, close: () => void) {
  if (!dueAt || processing.value) return
  processing.value = true
  close()
  router.patch(
    `/boats/${props.boatId}/maintenance-tasks/${props.taskId}`,
    { dueAt },
    {
      preserveScroll: true,
      onFinish: () => {
        processing.value = false
        customDate.value = ''
      },
    }
  )
}

function postpone(preset: PostponePreset, close: () => void) {
  submit(postponedDueDate(props.dueAt, preset, todayDateInputValue()), close)
}
</script>

<template>
  <BaseDropdown align="right">
    <template #trigger>{{ t('boats.maintenance.tasks.postpone.label') }}</template>
    <template #default="{ close }">
      <button
        v-for="preset in POSTPONE_PRESETS"
        :key="preset"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        :disabled="processing"
        @click="postpone(preset, close)"
      >
        {{ t(`boats.maintenance.tasks.postpone.${preset}`) }}
      </button>
      <form
        class="flex items-end gap-2 border-t border-border px-3 pb-2 pt-3"
        @submit.prevent="submit(customDate, close)"
      >
        <label class="flex-1 text-xs font-medium text-fg-muted">
          {{ t('boats.maintenance.tasks.postpone.customDate') }}
          <input
            v-model="customDate"
            type="date"
            name="dueAt"
            :min="dueAt"
            required
            class="mt-1 block w-full rounded-(--radius-control) border border-border bg-surface px-2 py-1 text-sm text-fg"
          />
        </label>
        <button
          type="submit"
          class="rounded-(--radius-control) bg-brand px-3 py-1.5 text-sm font-semibold text-on-brand hover:bg-brand-hover"
          :disabled="processing || !customDate"
        >
          {{ t('boats.maintenance.tasks.postpone.apply') }}
        </button>
      </form>
    </template>
  </BaseDropdown>
</template>
