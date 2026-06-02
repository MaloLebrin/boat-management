<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface SecurityItem {
  icon: string
  title: string
  description: string
}

defineProps<{
  title: string
  subtitle: string
  items: SecurityItem[]
}>()

const { el: sectionEl, isVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(el) => (sectionEl = el as HTMLElement)"
    class="reveal bg-cream px-6 py-20 lg:px-8 lg:py-24"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <!-- Left: title -->
        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            {{ subtitle }}
          </p>
          <h2 class="font-display text-3xl leading-tight text-fg lg:text-4xl">{{ title }}</h2>
        </div>

        <!-- Right: grid of cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(item, idx) in items"
            :key="item.title"
            class="reveal rounded-xl border border-bone bg-white p-5 transition-transform duration-300 hover:-translate-y-1"
            :class="[`reveal-delay-${idx % 4}`, { visible: isVisible }]"
          >
            <div
              class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100 text-xl"
            >
              {{ item.icon }}
            </div>
            <h3 class="mb-1 font-semibold text-fg">{{ item.title }}</h3>
            <p class="text-sm text-fg-muted">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
