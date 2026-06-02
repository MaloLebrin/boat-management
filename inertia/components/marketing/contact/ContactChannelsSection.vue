<script setup lang="ts">
interface Channel {
  icon: string
  title: string
  desc: string
  cta: string
  tone?: string
}

defineProps<{
  items: Channel[]
}>()
</script>

<template>
  <section class="bg-cream px-6 py-12 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="(item, idx) in items"
          :key="idx"
          :class="[
            'flex min-h-56 flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md',
            item.tone === 'navy'
              ? 'border-navy-900 bg-navy-900 text-white'
              : item.tone === 'coral'
                ? 'border-coral-500 bg-coral-500 text-white'
                : 'border-bone bg-white text-fg',
          ]"
        >
          <!-- Icon -->
          <div
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-xl text-xl',
              item.tone === 'navy'
                ? 'bg-white/10'
                : item.tone === 'coral'
                  ? 'bg-white/15'
                  : 'bg-bone',
            ]"
          >
            {{ item.icon }}
          </div>

          <!-- Title -->
          <h3 class="font-semibold leading-tight">{{ item.title }}</h3>

          <!-- Desc -->
          <p
            :class="[
              'flex-1 text-sm leading-relaxed',
              item.tone ? 'text-white/80' : 'text-fg-muted',
            ]"
          >
            {{ item.desc }}
          </p>

          <!-- CTA -->
          <p
            :class="[
              'text-sm font-medium',
              item.tone === 'navy'
                ? 'text-coral-400'
                : item.tone === 'coral'
                  ? 'text-white'
                  : 'text-navy-900',
            ]"
          >
            {{ item.cta }} →
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
