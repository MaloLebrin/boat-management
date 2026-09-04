<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  subtitle: string
  items: Array<{ step: string; title: string; description: string }>
}>()
</script>

<template>
  <section class="bg-paper px-6 py-16 lg:px-8 lg:py-20">
    <div class="mx-auto max-w-5xl">
      <div class="text-center">
        <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
          {{ eyebrow }}
        </p>
        <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">{{ title }}</h2>
        <p class="mt-3 text-fg-muted">{{ subtitle }}</p>
      </div>
      <ol class="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <li
          v-for="item in items"
          :key="item.step"
          class="rounded-xl border border-border bg-surface p-6"
        >
          <p
            class="flex h-10 w-10 items-center justify-center rounded-full bg-coral-100 font-display text-lg font-bold text-coral-700"
          >
            {{ item.step }}
          </p>
          <p class="mt-4 font-semibold text-fg">{{ item.title }}</p>
          <p class="mt-2 text-sm text-fg-muted">{{ item.description }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
