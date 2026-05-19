<script setup lang="ts">
defineProps<{
  url?: string
}>()
</script>

<template>
  <div
    class="overflow-hidden rounded-xl bg-cream shadow-[0_32px_80px_rgba(11,29,46,0.18)]"
    style="border: 1px solid #ebe2d0"
  >
    <!-- Browser chrome -->
    <div class="flex items-center gap-2 border-b border-bone bg-paper px-3 py-2">
      <!-- Traffic lights -->
      <div class="flex items-center gap-1.5">
        <div class="h-3 w-3 rounded-full bg-coral-400" />
        <div class="h-3 w-3 rounded-full bg-amber-400" />
        <div class="h-3 w-3 rounded-full bg-mint-400" />
      </div>
      <!-- URL bar -->
      <div class="flex flex-1 items-center justify-center">
        <div class="flex items-center gap-1.5 rounded-md bg-cream/80 px-3 py-1">
          <svg class="h-3 w-3 text-fg-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span class="text-xs text-fg-muted">{{ url || 'app.fleetai.fr' }}</span>
        </div>
      </div>
      <!-- Spacer for symmetry -->
      <div class="w-[52px]" />
    </div>
    <!-- Content -->
    <div class="aspect-[16/10] w-full">
      <slot />
    </div>
  </div>
</template>
