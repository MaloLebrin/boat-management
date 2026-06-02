<script setup lang="ts">
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
  <section class="bg-cream px-6 py-20 lg:px-8 lg:py-28">
    <div class="mx-auto max-w-3xl text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ eyebrowLabel }}
      </p>
      <h1
        class="mt-4 font-display text-5xl leading-tight tracking-tight text-fg lg:text-6xl xl:text-7xl"
      >
        {{ title }}
        <em class="text-coral-500">{{ titleHighlight }}</em>
      </h1>
      <p class="mt-4 text-lg text-fg-muted">{{ subtitle }}</p>

      <!-- Billing toggle -->
      <div class="mt-10 inline-flex items-center gap-1 rounded-full bg-paper p-1">
        <button
          type="button"
          :class="[
            'rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
            billing === 'monthly' ? 'bg-navy-900 text-white' : 'text-fg-muted hover:bg-bone',
          ]"
          @click="emit('update:billing', 'monthly')"
        >
          {{ monthlyLabel }}
        </button>
        <button
          type="button"
          :class="[
            'relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
            billing === 'annual' ? 'bg-navy-900 text-white' : 'text-fg-muted hover:bg-bone',
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
