<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface Location {
  city: string
  addr: string
  role: string
}

interface OfficeCard {
  city: string
  role: string
  addr: string
  hours: string
  team: string
  hint: string
  gradient: string
}

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  body: string
  locationLabel: string
  locations: Location[]
  officeCards: OfficeCard[]
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
        <!-- Left: text + locations -->
        <div>
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            {{ eyebrow }}
          </p>
          <h2 class="mt-3 font-display text-3xl leading-tight text-fg lg:text-4xl">
            {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
          </h2>
          <p class="mt-4 text-base leading-relaxed text-fg-muted">{{ body }}</p>
          <div class="mt-6 space-y-4">
            <div v-for="loc in locations" :key="loc.city" class="flex items-start gap-3">
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bone text-sm"
              >
                🌐
              </div>
              <div>
                <p class="font-semibold text-fg">{{ loc.city }}</p>
                <p class="text-sm text-fg-muted">{{ loc.addr }}</p>
                <p class="font-mono text-xs italic text-fg-subtle">{{ loc.role }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: office cards -->
        <div class="grid gap-6">
          <div
            v-for="office in officeCards"
            :key="office.city"
            class="overflow-hidden rounded-2xl border border-bone bg-white"
          >
            <div
              class="relative flex items-end px-6 py-8"
              :style="{ height: '140px', background: office.gradient }"
            >
              <svg
                viewBox="0 0 400 200"
                preserveAspectRatio="none"
                class="pointer-events-none absolute inset-0 h-full w-full opacity-20"
              >
                <path d="M0 130 Q100 110 200 130 T400 130 L400 200 L0 200 Z" fill="#faf6ee" />
                <path
                  d="M0 150 Q100 130 200 150 T400 150 L400 200 L0 200 Z"
                  fill="#faf6ee"
                  opacity="0.6"
                />
              </svg>
              <div class="relative">
                <p class="font-display text-4xl leading-none text-white">{{ office.city }}</p>
                <p class="mt-1 text-xs text-white/80">{{ office.role }}</p>
              </div>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <span class="font-medium text-fg-subtle">{{ locationLabel }}</span>
                <span class="text-fg">{{ office.addr }}</span>
                <span class="font-medium text-fg-subtle">Horaires</span>
                <span class="text-fg">{{ office.hours }}</span>
                <span class="font-medium text-fg-subtle">Équipe</span>
                <span class="text-fg">{{ office.team }}</span>
              </div>
              <div class="mt-4 flex items-start gap-2 rounded-xl bg-cream px-3 py-2">
                <span class="mt-0.5 text-xs text-coral-500">✦</span>
                <p class="text-xs leading-relaxed text-fg-muted">{{ office.hint }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
