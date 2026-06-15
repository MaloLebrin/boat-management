<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface TestimonialItem {
  stat: string
  statLabel: string
  quote: string
  name: string
  org: string
  role: string
  plan: string
}

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  items: TestimonialItem[]
}>()

const { el, isVisible } = useScrollReveal()
</script>

<template>
  <section :ref="el" class="reveal bg-cream px-6 py-20 lg:px-8" :class="{ visible: isVisible }">
    <div class="mx-auto max-w-7xl">
      <!-- Header -->
      <div class="mb-12 text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
          {{ eyebrow }}
        </p>
        <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">
          {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
        </h2>
      </div>

      <!-- Cards -->
      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="(item, idx) in items"
          :key="item.name"
          class="rounded-2xl bg-paper p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          :style="{ transitionDelay: `${idx * 100}ms` }"
        >
          <!-- Stat -->
          <p class="font-display text-4xl text-coral-500 lg:text-5xl">
            {{ item.stat }}
          </p>
          <p class="mt-1 text-xs font-medium uppercase tracking-widest text-fg-subtle">
            {{ item.statLabel }}
          </p>

          <!-- Quote -->
          <blockquote class="mt-6 border-t border-bone pt-6">
            <p class="text-sm leading-relaxed text-fg-muted italic">"{{ item.quote }}"</p>
          </blockquote>

          <!-- Author -->
          <div class="mt-4 flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-fg">{{ item.name }}</p>
              <p class="text-xs text-fg-subtle">{{ item.org }} - {{ item.role }}</p>
            </div>
            <span class="rounded-full bg-navy-900/10 px-3 py-1 text-xs font-medium text-navy-900">
              {{ item.plan }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
