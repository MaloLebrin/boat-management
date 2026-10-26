<script setup lang="ts">
import BaseAlert from '~/components/base/BaseAlert.vue'
import { useT } from '~/composables/use_t'

/** Attente du premier lot du plugin ; « Toujours rien ? » après le délai maximal. */
defineProps<{ waiting: boolean; timedOut: boolean; received: boolean }>()
defineEmits<{ retry: [] }>()

const { t } = useT()
const causes = ['network', 'token', 'restart', 'node'] as const
</script>

<template>
  <div data-testid="instrument-setup-waiting" aria-live="polite">
    <BaseAlert v-if="received" variant="success">{{
      t('instruments.setup.waiting.received')
    }}</BaseAlert>
    <BaseAlert v-else-if="waiting" variant="info">{{
      t('instruments.setup.waiting.waiting')
    }}</BaseAlert>
    <div v-else-if="timedOut" class="space-y-2" data-testid="instrument-setup-stuck">
      <p class="text-sm font-semibold text-fg">{{ t('instruments.setup.waiting.stuck') }}</p>
      <ul class="list-disc space-y-1 pl-5 text-sm text-fg-muted">
        <li v-for="cause in causes" :key="cause">
          {{ t(`instruments.setup.waiting.causes.${cause}`) }}
        </li>
      </ul>
      <button
        type="button"
        class="text-sm font-medium text-brand underline"
        @click="$emit('retry')"
      >
        {{ t('instruments.setup.waiting.retry') }}
      </button>
    </div>
  </div>
</template>
