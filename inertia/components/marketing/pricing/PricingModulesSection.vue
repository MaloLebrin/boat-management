<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface ModuleItem {
  icon: string
  name: string
  desc: string
  price: number
}

defineProps<{
  eyebrow: string
  title: string
  subtitle: string
  note: string
  pricePer: string
  includedLabel: string
  items: ModuleItem[]
}>()

const { el, isVisible } = useScrollReveal()
</script>

<template>
  <section :ref="el" class="reveal bg-paper px-6 py-20 lg:px-8" :class="{ visible: isVisible }">
    <div class="mx-auto max-w-5xl">
      <!-- Header -->
      <div class="mb-12 text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{{ eyebrow }}</p>
        <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">{{ title }}</h2>
        <p class="mt-2 text-fg-muted">{{ subtitle }}</p>
      </div>

      <!-- Module cards -->
      <div class="grid gap-6 sm:grid-cols-2">
        <div
          v-for="(item, idx) in items"
          :key="item.name"
          class="rounded-2xl border border-bone bg-cream p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          :style="{ transitionDelay: `${idx * 100}ms` }"
        >
          <span class="text-3xl">{{ item.icon }}</span>
          <h3 class="mt-4 font-semibold text-fg">{{ item.name }}</h3>
          <p class="mt-1 text-sm text-fg-muted">{{ item.desc }}</p>
          <div class="mt-4 flex items-baseline gap-1 border-t border-dashed border-current/10 pt-4">
            <span class="font-display text-2xl text-fg">{{ item.price }} €</span>
            <span class="text-sm text-fg-subtle">{{ pricePer }}</span>
          </div>
        </div>
      </div>

      <!-- Note : disponible sur Pro, inclus dans Enterprise -->
      <p class="mt-8 text-center text-sm text-fg-muted">
        {{ note }}
        <span class="font-medium text-fg">{{ includedLabel }}</span>
      </p>
    </div>
  </section>
</template>
