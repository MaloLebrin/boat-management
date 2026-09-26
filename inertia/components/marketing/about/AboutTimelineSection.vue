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

const { isVisible } = useScrollReveal()

// Pastilles en classes de palette et non en hex dans `:style` (#831) : la CSP
// ne couvre pas les attributs `style`, et les tokens suivent le thème sombre.
function dotClass(tone?: string) {
  if (tone === 'coral') return 'border-coral-100 bg-coral-500'
  if (tone === 'mint') return 'border-mint-100 bg-mint-700'
  return 'border-bone bg-surface-elevated'
}
</script>

<template>
  <section ref="el" class="reveal bg-cream px-6 py-20 lg:px-8" :class="{ visible: isVisible }">
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
              class="absolute left-[9px] top-1 h-[15px] w-[15px] rounded-full border-[3px] ring-1 ring-bone"
              :class="dotClass(item.tone)"
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
