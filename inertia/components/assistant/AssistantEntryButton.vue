<script setup lang="ts">
import { useAssistantPanel } from '~/composables/use_assistant_panel'
import { usePermissions } from '~/composables/use_permissions'
import { useT } from '~/composables/use_t'

/**
 * Entrée « FleetAi » épinglée en bas des sidebars (desktop + drawer mobile) —
 * accent violet, comme le mock marketing `HomeMockFleetide`.
 */
const emit = defineEmits<{ activate: [] }>()

const { t } = useT()
const { isOpen, toggle } = useAssistantPanel()
// Pas de copilote pour le portail propriétaire : aucune donnée de flotte à requêter.
const { isBoatOwner } = usePermissions()

function onClick() {
  toggle()
  if (isOpen.value) emit('activate')
}
</script>

<template>
  <button
    v-if="!isBoatOwner"
    type="button"
    :class="[
      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isOpen
        ? 'bg-violet-600/40 text-white'
        : 'bg-violet-600/20 text-lilac-300 hover:bg-violet-600/30 hover:text-white',
    ]"
    :aria-pressed="isOpen ? 'true' : 'false'"
    :aria-label="t('assistant.open')"
    @click="onClick"
  >
    <span class="text-lilac-300" aria-hidden="true">&#10022;</span>
    <span class="font-display">Fleet<em class="text-coral-500">Ai</em></span>
  </button>
</template>
