<script setup lang="ts">
import BaseAlert from '~/components/base/BaseAlert.vue'
import { useT } from '~/composables/use_t'

/**
 * Codes de secours en clair (#884) : montrés une seule fois, à la génération.
 * Ils ne sont plus récupérables ensuite — seulement régénérables.
 */
defineProps<{ codes: string[] }>()

const { t } = useT()
</script>

<template>
  <BaseAlert variant="warning" :title="t('settings.security.twoFactor.recovery.title')">
    <p>{{ t('settings.security.twoFactor.recovery.warning') }}</p>
    <ul
      class="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-fg"
      data-testid="two-factor-recovery-codes"
    >
      <li v-for="code in codes" :key="code" class="rounded bg-surface px-2 py-1">{{ code }}</li>
    </ul>
  </BaseAlert>
</template>
