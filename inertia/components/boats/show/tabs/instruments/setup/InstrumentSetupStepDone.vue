<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import IosInstallHint from '~/components/pwa/IosInstallHint.vue'
import { useT } from '~/composables/use_t'

defineProps<{ firstReadings: number }>()
defineEmits<{ dismiss: [] }>()

const { t } = useT()
</script>

<template>
  <div class="space-y-4" data-testid="instrument-setup-done">
    <p class="text-sm text-fg">
      {{ t('instruments.setup.done.readings', { count: firstReadings }) }}
    </p>
    <p class="text-sm text-fg-muted">{{ t('instruments.setup.done.rules') }}</p>
    <IosInstallHint />
    <BaseButton
      type="button"
      variant="secondary"
      data-testid="instrument-setup-dismiss"
      @click="$emit('dismiss')"
    >
      {{ t('instruments.setup.done.dismiss') }}
    </BaseButton>
  </div>
</template>
