<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'

interface Channel {
  icon: string
  title: string
  desc: string
  cta: string
  tone?: string
  /** Cible du clic (#450) — les cartes ne sont plus décoratives. */
  href: string
  /**
   * `anchor` = saut dans la page, `internal` = <Link> Inertia, `external` = mailto:,
   * `demo` = bouton qui lance la session de démo autonome (POST Inertia sur `href`).
   */
  kind: 'anchor' | 'internal' | 'external' | 'demo'
}

defineProps<{
  items: Channel[]
}>()

// Session de démo autonome : POST Inertia (CSRF automatique), comme HomeDemoSection.
const demoForm = useForm({})

function onCardClick(item: Channel) {
  if (item.kind === 'demo' && !demoForm.processing) demoForm.post(item.href)
}

function cardClass(tone?: string) {
  if (tone === 'navy') return 'border-navy-900 bg-navy-900 text-white'
  if (tone === 'coral') return 'border-coral-500 bg-coral-500 text-white'
  return 'border-bone bg-surface-elevated text-fg'
}

function iconClass(tone?: string) {
  if (tone === 'navy') return 'bg-white/10'
  if (tone === 'coral') return 'bg-white/15'
  return 'bg-bone'
}

function ctaClass(tone?: string) {
  if (tone === 'navy') return 'text-coral-400'
  if (tone === 'coral') return 'text-white'
  return 'text-fg'
}
</script>

<template>
  <section class="bg-cream px-6 py-12 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <component
          :is="item.kind === 'demo' ? 'button' : item.kind === 'internal' ? Link : 'a'"
          v-for="(item, idx) in items"
          :key="idx"
          :href="item.kind === 'demo' ? undefined : item.href"
          :type="item.kind === 'demo' ? 'button' : undefined"
          :disabled="item.kind === 'demo' && demoForm.processing ? true : undefined"
          :class="[
            'flex min-h-56 flex-col gap-4 rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md',
            cardClass(item.tone),
          ]"
          @click="onCardClick(item)"
        >
          <!-- Icon -->
          <div
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-xl text-xl',
              iconClass(item.tone),
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
          <p :class="['text-sm font-medium', ctaClass(item.tone)]">{{ item.cta }} →</p>
        </component>
      </div>
    </div>
  </section>
</template>
