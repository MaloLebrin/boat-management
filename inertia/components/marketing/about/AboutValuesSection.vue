<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface ValueItem {
  n: string
  title: string
  desc: string
  extra: string
}

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  items: ValueItem[]
}>()

const { el, isVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(r) => (el = r as HTMLElement)"
    class="reveal bg-cream px-6 py-20 lg:px-8"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="mb-12 text-center">
        <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
          {{ eyebrow }}
        </p>
        <h2 class="mt-3 font-display text-3xl text-fg lg:text-4xl">
          {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
        </h2>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <div
          v-for="(item, idx) in items"
          :key="item.n"
          class="rounded-2xl border border-bone bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          :style="{ transitionDelay: `${idx * 80}ms` }"
        >
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-500">
            {{ item.n }} · PRINCIPE
          </p>
          <h3 class="mt-3 font-display text-2xl leading-tight text-fg">{{ item.title }}</h3>
          <p class="mt-3 text-sm leading-relaxed text-fg-muted">{{ item.desc }}</p>
          <div class="mt-4 border-t border-dashed border-bone pt-4">
            <p class="font-mono text-xs font-medium text-mint-600">↳ {{ item.extra }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
