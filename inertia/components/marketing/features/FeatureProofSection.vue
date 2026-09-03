<script setup lang="ts">
defineProps<{
  stats: Array<{ value: string; label: string }>
  quote: { text: string; author: string; role: string }
}>()
</script>

<template>
  <section class="bg-cream px-6 py-16 lg:px-8 lg:py-20">
    <div class="mx-auto max-w-4xl">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div v-for="(stat, i) in stats" :key="i" class="text-center">
          <p class="font-display text-3xl font-bold text-coral-500">{{ stat.value }}</p>
          <p class="mt-1 text-sm text-fg-muted">{{ stat.label }}</p>
        </div>
      </div>
      <figure class="mx-auto mt-12 max-w-2xl rounded-2xl border border-border bg-surface p-8">
        <blockquote class="font-display text-xl leading-relaxed text-fg">
          « {{ quote.text }} »
        </blockquote>
        <figcaption class="mt-4 text-sm text-fg-muted">
          <span class="font-semibold text-fg">{{ quote.author }}</span>
          — {{ quote.role }}
        </figcaption>
      </figure>
    </div>
  </section>
</template>
