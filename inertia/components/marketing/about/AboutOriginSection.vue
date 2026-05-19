<script setup lang="ts">
import { useScrollReveal } from '~/composables/useScrollReveal'

defineProps<{
  eyebrow: string
  title: string
  paragraphs: string[]
  captionDate: string
  captionSub: string
}>()

const { el, isVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(r) => (el = r as HTMLElement)"
    class="reveal bg-paper px-6 py-20 lg:px-8"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="grid items-center gap-16 lg:grid-cols-2">
        <!-- Left: illustration -->
        <div
          class="relative overflow-hidden rounded-2xl border border-bone"
          style="aspect-ratio: 4/5; background: linear-gradient(135deg, #dde7f0, #faf6ee)"
        >
          <svg viewBox="0 0 400 500" class="absolute inset-0 h-full w-full">
            <circle cx="320" cy="120" r="40" fill="#fbeacb" />
            <path d="M0 360 Q100 340 200 360 T400 360 L400 500 L0 500 Z" fill="#1a3a55" opacity="0.85" />
            <path d="M0 380 Q100 360 200 380 T400 380 L400 500 L0 500 Z" fill="#0b1d2e" />
            <g transform="translate(180 280)">
              <path d="M-30 50 L30 50 L20 75 L-20 75 Z" fill="#faf6ee" stroke="#0b1d2e" stroke-width="2" />
              <path d="M0 -20 L0 50" stroke="#0b1d2e" stroke-width="2" />
              <path d="M0 -15 L25 45 L0 45 Z" fill="#e2674f" stroke="#0b1d2e" stroke-width="2" />
              <path d="M0 -15 L-20 35 L0 35 Z" fill="#faf6ee" stroke="#0b1d2e" stroke-width="2" />
            </g>
          </svg>
          <div
            class="absolute bottom-4 left-4 right-4 rounded-lg px-3 py-2 text-white"
            style="background: rgba(11,29,46,0.85); backdrop-filter: blur(8px)"
          >
            <p class="font-mono text-[10px] font-semibold uppercase tracking-widest text-coral-400">
              {{ captionDate }}
            </p>
            <p class="mt-1 text-xs text-white/80">{{ captionSub }}</p>
          </div>
        </div>

        <!-- Right: story -->
        <div>
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            {{ eyebrow }}
          </p>
          <h2 class="mt-3 font-display text-3xl leading-tight text-fg lg:text-4xl">
            {{ title }}
          </h2>
          <div class="mt-6 space-y-4">
            <p
              v-for="(p, i) in paragraphs"
              :key="i"
              class="text-base leading-relaxed text-fg-muted"
            >
              {{ p }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
