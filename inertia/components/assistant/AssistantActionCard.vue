<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import { useDateFormat } from '~/composables/use_date_format'
import { usePermissions } from '~/composables/use_permissions'
import { useT } from '~/composables/use_t'
import type { AssistantTaskProposal } from '#shared/types/assistant'

/**
 * Carte de confirmation d'une proposition de tâche. Les boutons n'envoient
 * AUCUN payload : le serveur exécute uniquement la proposition stockée dans
 * `pending_action` (et la policy Bouncer reste le vrai garde-fou — le masquage
 * du bouton sans `maintenance.create` n'est que du confort).
 */
const props = defineProps<{
  token: string
  proposal: AssistantTaskProposal
}>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { can } = usePermissions()

const processing = ref(false)

const canConfirm = computed(() => can('maintenance.create'))

const dueLabel = computed(() => {
  if (props.proposal.dueAt !== null) return formatDate(props.proposal.dueAt)
  if (props.proposal.dueEngineHours !== null) {
    return t('assistant.proposal.dueHours', { hours: String(props.proposal.dueEngineHours) })
  }
  return null
})

const recurrenceLabel = computed(() => {
  if (props.proposal.recurrenceIntervalMonths !== null) {
    return t('assistant.proposal.recurrenceMonths', {
      count: String(props.proposal.recurrenceIntervalMonths),
    })
  }
  if (props.proposal.recurrenceIntervalEngineHours !== null) {
    return t('assistant.proposal.recurrenceHours', {
      hours: String(props.proposal.recurrenceIntervalEngineHours),
    })
  }
  return null
})

function post(action: 'confirm' | 'dismiss') {
  if (processing.value) return
  router.post(
    `/assistant/conversations/${props.token}/action/${action}`,
    {},
    {
      preserveScroll: true,
      preserveState: true,
      only: ['assistantConversation', 'errors', 'flash'],
      onStart: () => {
        processing.value = true
      },
      onFinish: () => {
        processing.value = false
      },
    }
  )
}
</script>

<template>
  <div class="rounded-xl border border-violet-500/40 bg-violet-600/20 px-4 py-3">
    <p class="text-xs font-semibold uppercase tracking-wide text-lilac-300">
      {{ t('assistant.proposal.title') }}
    </p>
    <p class="mt-2 text-sm font-semibold text-white">{{ proposal.title }}</p>
    <dl class="mt-1 space-y-0.5 text-xs text-navy-200">
      <div class="flex gap-1">
        <dt>{{ t('assistant.proposal.boat') }}</dt>
        <dd class="font-medium text-navy-100">
          {{ proposal.boatName
          }}<template v-if="proposal.engineLabel"> — {{ proposal.engineLabel }}</template>
        </dd>
      </div>
      <div v-if="dueLabel" class="flex gap-1">
        <dt>{{ t('assistant.proposal.due') }}</dt>
        <dd class="font-medium text-navy-100">{{ dueLabel }}</dd>
      </div>
      <div v-if="recurrenceLabel" class="flex gap-1">
        <dt>{{ t('assistant.proposal.recurrence') }}</dt>
        <dd class="font-medium text-navy-100">{{ recurrenceLabel }}</dd>
      </div>
      <p v-if="proposal.notes" class="pt-1 text-navy-200">{{ proposal.notes }}</p>
    </dl>

    <div class="mt-3 flex items-center gap-2">
      <button
        v-if="canConfirm"
        type="button"
        class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 transition-colors hover:bg-white/90 disabled:opacity-60"
        :disabled="processing"
        @click="post('confirm')"
      >
        {{ t('assistant.proposal.confirm') }}
      </button>
      <button
        type="button"
        class="rounded-lg border border-navy-500 px-3 py-1.5 text-xs font-medium text-navy-100 transition-colors hover:bg-navy-700 disabled:opacity-60"
        :disabled="processing"
        @click="post('dismiss')"
      >
        {{ t('assistant.proposal.dismiss') }}
      </button>
    </div>
    <p v-if="!canConfirm" class="mt-2 text-[11px] text-navy-300">
      {{ t('assistant.proposal.noPermission') }}
    </p>
  </div>
</template>
