<script setup lang="ts">
import { ClockIcon } from '@heroicons/vue/24/outline'

/** Temps estimé par chemin, sous le hero (#1022). */
defineProps<{ items: Array<{ label: string; value: string }> }>()
</script>

<template>
  <section class="bg-paper px-6 py-8 lg:px-8" data-testid="install-durations">
    <ul class="mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-3">
      <li
        v-for="item in items"
        :key="item.label"
        class="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
        data-testid="install-duration"
      >
        <ClockIcon class="h-6 w-6 shrink-0 text-coral-600" aria-hidden="true" />
        <div>
          <p class="font-display text-lg font-bold text-fg">{{ item.value }}</p>
          <p class="text-xs text-fg-muted">{{ item.label }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>
