<script setup lang="ts">
interface StatItem {
  value: string
  label: string
}

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  stats: StatItem[]
  investorsLabel: string
  investors: string[]
}>()
</script>

<template>
  <section class="relative overflow-hidden bg-navy-900 px-6 py-20 lg:px-8">
    <!-- Decorative needle -->
    <svg
      viewBox="0 0 200 200"
      class="pointer-events-none absolute right-0 top-0 h-96 w-96 translate-x-1/3 -translate-y-1/4 opacity-5"
    >
      <path d="M100 20 L130 100 L100 120 L70 100 Z" fill="#faf6ee" />
      <path d="M100 180 L130 100 L100 80 L70 100 Z" fill="#e2674f" />
    </svg>

    <div class="relative mx-auto max-w-7xl">
      <div class="mb-16 text-center">
        <p class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-400">
          {{ eyebrow }}
        </p>
        <h2 class="mt-3 font-display text-3xl text-white lg:text-4xl">
          {{ title }} <em class="text-coral-400">{{ titleHighlight }}</em>
        </h2>
      </div>

      <!-- Stats grid -->
      <div class="grid divide-x divide-white/10 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="(stat, idx) in stats"
          :key="stat.label"
          class="px-8 py-4 text-center"
          :class="idx === 0 ? 'border-l-0' : ''"
        >
          <p class="font-display text-5xl tracking-tight text-white lg:text-6xl">
            {{ stat.value }}
          </p>
          <p class="mt-3 text-sm text-white/60">{{ stat.label }}</p>
        </div>
      </div>

      <!-- Investors -->
      <div class="mt-16">
        <p
          class="mb-6 text-center font-mono text-xs font-semibold uppercase tracking-widest text-white/40"
        >
          {{ investorsLabel }}
        </p>
        <div class="flex flex-wrap items-center justify-center gap-10 opacity-60">
          <span
            v-for="investor in investors"
            :key="investor"
            class="font-display text-xl text-white"
          >
            {{ investor }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
