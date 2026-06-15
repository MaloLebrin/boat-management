<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface TimelineItem {
  d: string
  t: string
  sub: string
  tone?: string
}

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  items: TimelineItem[]
}>()

const { el, isVisible } = useScrollReveal()

function dotBg(tone?: string) {
  if (tone === 'coral') return '#e2674f'
  if (tone === 'mint') return '#1f6b54'
  return '#fff'
}

function dotBorder(tone?: string) {
  if (tone === 'coral') return '#fadcd2'
  if (tone === 'mint') return '#cfe8de'
  return '#dde7f0'
}
</script>

<template>
  <section :ref="el" class="reveal bg-cream px-6 py-20 lg:px-8" :class="{ visible: isVisible }">
    <div class="mx-auto max-w-7xl">
      <div class="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
        <!-- Left: heading -->
        <div class="lg:pt-2">
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            {{ eyebrow }}
          </p>
          <h2 class="mt-3 font-display text-3xl leading-tight text-fg lg:text-4xl">
            {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
          </h2>
          <p class="mt-3 text-fg-muted">{{ subtitle }}</p>
        </div>

        <!-- Right: timeline -->
        <div class="relative">
          <div class="absolute bottom-0 left-4 top-2 w-px border-l border-dashed border-bone" />
          <div v-for="(item, idx) in items" :key="idx" class="relative pb-8 pl-12">
            <!-- Dot -->
            <div
              class="absolute left-[9px] top-1 h-[15px] w-[15px] rounded-full ring-1 ring-bone"
              :style="{
                background: dotBg(item.tone),
                border: `3px solid ${dotBorder(item.tone)}`,
              }"
            />
            <p class="font-mono text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              {{ item.d }}
            </p>
            <p class="mt-1.5 font-semibold text-fg">{{ item.t }}</p>
            <p class="mt-1 text-sm text-fg-muted">{{ item.sub }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
