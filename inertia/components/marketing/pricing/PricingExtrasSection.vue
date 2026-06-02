<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface ExtraItem {
  icon: string
  title: string
  sub: string
  price: string
  priceSub: string
  tone: string
}

defineProps<{
  eyebrow: string
  title: string
  subtitle: string
  items: ExtraItem[]
}>()

const { el, isVisible } = useScrollReveal()

function getToneClasses(tone: string) {
  switch (tone) {
    case 'mint':
      return 'border-mint-600/20 bg-mint-600/5'
    case 'coral':
      return 'border-coral-500/20 bg-coral-500/5'
    case 'navy':
      return 'border-navy-900/20 bg-navy-900/5'
    default:
      return 'border-bone bg-paper'
  }
}
</script>

<template>
  <section
    :ref="(r) => (el = r as HTMLElement)"
    class="reveal bg-cream px-6 py-20 lg:px-8"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <!-- Header -->
      <div class="mb-12 text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
          {{ eyebrow }}
        </p>
        <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">{{ title }}</h2>
        <p class="mt-2 text-fg-muted">{{ subtitle }}</p>
      </div>

      <!-- Cards -->
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="(item, idx) in items"
          :key="item.title"
          :class="[
            'rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md',
            getToneClasses(item.tone),
          ]"
          :style="{ transitionDelay: `${idx * 100}ms` }"
        >
          <!-- Icon -->
          <span class="text-3xl">{{ item.icon }}</span>

          <!-- Title -->
          <h3 class="mt-4 font-semibold text-fg">{{ item.title }}</h3>

          <!-- Sub -->
          <p class="mt-1 text-sm text-fg-muted">{{ item.sub }}</p>

          <!-- Price -->
          <div class="mt-4 border-t border-dashed border-current/10 pt-4">
            <p class="font-display text-2xl text-fg">{{ item.price }}</p>
            <p class="text-xs text-fg-subtle">{{ item.priceSub }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
