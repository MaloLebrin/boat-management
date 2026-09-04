<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import type { FeatureCrossLink } from '#shared/types/marketing'

defineProps<{
  eyebrow: string
  title: string
  linkLabel: string
  items: FeatureCrossLink[]
}>()
</script>

<template>
  <section class="bg-paper px-6 py-16 lg:px-8 lg:py-20">
    <div class="mx-auto max-w-5xl">
      <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ eyebrow }}
      </p>
      <h2 class="mt-2 font-display text-2xl text-fg lg:text-3xl">{{ title }}</h2>
      <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          v-for="item in items"
          :key="item.href"
          :href="item.href"
          class="group rounded-xl border border-border bg-surface p-6 transition hover:border-coral-300"
        >
          <p class="font-semibold text-fg">{{ item.title }}</p>
          <p class="mt-2 text-sm text-fg-muted">{{ item.description }}</p>
          <p class="mt-4 text-sm font-semibold text-coral-600 group-hover:text-coral-700">
            {{ linkLabel }}
            <span aria-hidden="true">→</span>
          </p>
        </Link>
      </div>
    </div>
  </section>
</template>
