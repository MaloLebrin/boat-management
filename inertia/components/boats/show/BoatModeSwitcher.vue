<script setup lang="ts">
import { useT } from '~/composables/use_t'

const { t } = useT()

defineProps<{ boatId: number; mode: 'management' | 'navigation' }>()
</script>

<template>
  <div class="inline-flex gap-1 rounded-lg bg-bg-subtle p-1">
    <a :href="`/boats/${boatId}`">
      <button
        type="button"
        class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
        :class="
          mode === 'management'
            ? 'bg-bg-default text-fg-default shadow-sm'
            : 'text-fg-muted hover:text-fg-default'
        "
      >
        {{ t('boats.show.modeSwitch.management') }}
      </button>
    </a>
    <a :href="`/boats/${boatId}/navigation`">
      <button
        type="button"
        class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
        :class="
          mode === 'navigation'
            ? 'bg-bg-default text-fg-default shadow-sm'
            : 'text-fg-muted hover:text-fg-default'
        "
      >
        {{ t('boats.show.modeSwitch.navigation') }}
      </button>
    </a>
  </div>
</template>
