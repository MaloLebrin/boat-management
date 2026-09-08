<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import AssistantActionSummary from '~/components/assistant/AssistantActionSummary.vue'
import { usePermissions } from '~/composables/use_permissions'
import { usePlan } from '~/composables/use_plan'
import { useT } from '~/composables/use_t'
import { ASSISTANT_ACTION_META, type AssistantPendingAction } from '#shared/types/assistant'

/**
 * Carte de confirmation d'une proposition d'action. Les boutons n'envoient
 * AUCUN payload : le serveur exécute uniquement la proposition stockée dans
 * `pending_action` (et la policy Bouncer reste le vrai garde-fou — le masquage
 * du bouton sans capability n'est que du confort).
 */
const props = defineProps<{
  token: string
  proposal: AssistantPendingAction
}>()

const { t } = useT()
const { can } = usePermissions()
const { effectiveQuotas } = usePlan()

const processing = ref(false)

/** Title of the card based on action kind. */
const cardTitle = computed(() => t(`assistant.proposal.kinds.${props.proposal.kind}`))

/** Task title for create_task actions only. */
const taskTitle = computed(() =>
  props.proposal.kind === 'create_task' ? props.proposal.title : null
)

/**
 * Confirmation possible : capability du rôle ET flag de plan effectif — les
 * deux gardes que le serveur re-vérifie au confirm. Sans le flag, un plan
 * rétrogradé après la proposition afficherait un bouton qui échoue au clic.
 */
const canConfirm = computed(() => {
  const meta = ASSISTANT_ACTION_META[props.proposal.kind]
  if (!can(meta.capability)) return false
  if (meta.planFlag === undefined) return true
  return effectiveQuotas.value?.[meta.planFlag] === true
})

/** Confirm button label — task-specific for create_task, generic otherwise. */
const confirmLabel = computed(() =>
  props.proposal.kind === 'create_task'
    ? t('assistant.proposal.confirm')
    : t('assistant.proposal.confirmAction')
)

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
      {{ cardTitle }}
    </p>
    <p v-if="taskTitle" class="mt-2 text-sm font-semibold text-white">{{ taskTitle }}</p>

    <AssistantActionSummary :action="proposal" />

    <div class="mt-3 flex items-center gap-2">
      <button
        v-if="canConfirm"
        type="button"
        class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 transition-colors hover:bg-white/90 disabled:opacity-60"
        :disabled="processing"
        @click="post('confirm')"
      >
        {{ confirmLabel }}
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
