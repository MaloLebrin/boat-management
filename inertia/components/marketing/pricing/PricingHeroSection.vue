<script setup lang="ts">
import GradientMeshCanvas from '~/components/marketing/canvas/GradientMeshCanvas.vue'

defineProps<{
  eyebrowLabel: string
  title: string
  titleHighlight: string
  subtitle: string
  monthlyLabel: string
  annualLabel: string
  annualBadge: string
  billing: 'monthly' | 'annual'
}>()

const emit = defineEmits<{
  (e: 'update:billing', value: 'monthly' | 'annual'): void
}>()
</script>

<template>
  <section class="relative overflow-hidden bg-navy-900 px-6 py-20 lg:px-8 lg:py-28">
    <GradientMeshCanvas variant="sunset" :intensity="0.5" />
    <!-- Voile pour lisibilité du texte -->
    <div class="pointer-events-none absolute inset-0 bg-navy-900/30" aria-hidden="true" />

    <div class="relative mx-auto max-w-3xl text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-white/50">
        {{ eyebrowLabel }}
      </p>
      <h1
        class="mt-4 font-display text-5xl leading-tight tracking-tight text-white lg:text-6xl xl:text-7xl"
      >
        {{ title }}
        <em class="text-coral-400">{{ titleHighlight }}</em>
      </h1>
      <p class="mt-4 text-lg text-white/70">{{ subtitle }}</p>

      <!-- Billing toggle -->
      <div class="mt-10 inline-flex items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur">
        <button
          type="button"
          :class="[
            'rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
            billing === 'monthly' ? 'bg-white text-navy-900' : 'text-white/70 hover:bg-white/10',
          ]"
          @click="emit('update:billing', 'monthly')"
        >
          {{ monthlyLabel }}
        </button>
        <button
          type="button"
          :class="[
            'relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
            billing === 'annual' ? 'bg-white text-navy-900' : 'text-white/70 hover:bg-white/10',
          ]"
          @click="emit('update:billing', 'annual')"
        >
          {{ annualLabel }}
          <span
            class="absolute -right-2 -top-2 rounded-full bg-coral-500 px-2 py-0.5 text-[10px] font-bold text-white"
          >
            {{ annualBadge }}
          </span>
        </button>
      </div>
    </div>
  </section>
</template>
