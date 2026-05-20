<script setup lang="ts">
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/useT'

defineProps<{ open: boolean }>()
defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useT()
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('ports.plan.help.title')"
    size="md"
    @update:open="$emit('update:open', $event)"
  >
    <ol class="space-y-4">
      <li class="flex items-start gap-3">
        <span class="text-xl leading-none mt-0.5">⛵</span>
        <span class="text-sm text-fg-muted">{{ t('ports.plan.help.select') }}</span>
      </li>
      <li class="flex items-start gap-3">
        <span class="text-xl leading-none mt-0.5">📍</span>
        <span class="text-sm text-fg-muted">{{ t('ports.plan.help.assign') }}</span>
      </li>
      <li class="flex items-start gap-3">
        <span class="text-xl leading-none mt-0.5">🖱️</span>
        <span class="text-sm text-fg-muted">{{ t('ports.plan.help.deselect') }}</span>
      </li>
      <li class="flex items-start gap-3">
        <span class="text-xl leading-none mt-0.5">✋</span>
        <span class="text-sm text-fg-muted">{{ t('ports.plan.help.move') }}</span>
      </li>
    </ol>
  </BaseModal>
</template>
