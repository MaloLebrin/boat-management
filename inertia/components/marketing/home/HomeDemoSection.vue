<script setup lang="ts">
import { CheckCircleIcon, CalendarDaysIcon, PlayCircleIcon } from '@heroicons/vue/24/outline'
import { useForm, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

const demoForm = useForm({})

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  items: string[]
  ctaLabel: string
  ctaHref: string
  secondaryLabel: string
  noCommitment: string
  tryDemoLabel: string
  tryDemoSubtitle: string
  demoLoginPath: string
  locale: 'en' | 'fr'
}>()

const page = usePage<{ flash?: { error?: string } }>()
const flashError = computed(() => page.props.flash?.error ?? null)

const { el, isVisible } = useScrollReveal()
</script>

<template>
  <section
    id="demo"
    :ref="el"
    class="reveal bg-paper px-6 py-20 lg:px-8 lg:py-24"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <!-- Left: copy -->
        <div>
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-500">
            {{ eyebrow }}
          </p>
          <h2 class="mt-3 font-display text-3xl leading-tight text-fg lg:text-4xl">
            {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
          </h2>
          <p class="mt-4 text-lg text-fg-muted">{{ subtitle }}</p>

          <ul class="mt-8 space-y-4">
            <li v-for="item in items" :key="item" class="flex items-start gap-3">
              <CheckCircleIcon class="mt-0.5 h-5 w-5 shrink-0 text-coral-500" />
              <span class="text-fg-muted">{{ item }}</span>
            </li>
          </ul>
        </div>

        <!-- Right: two CTA cards -->
        <div class="flex flex-col gap-4">
          <!-- Try live demo card -->
          <div class="rounded-2xl border border-coral-200 bg-white p-8 shadow-sm lg:p-10">
            <div class="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-coral-500">
              <PlayCircleIcon class="h-7 w-7 text-white" />
            </div>
            <p class="font-display text-2xl text-fg">{{ tryDemoLabel }}</p>
            <p class="mt-2 text-sm text-fg-subtle">{{ tryDemoSubtitle }}</p>
            <div class="mt-6">
              <BaseButton
                size="lg"
                class="w-full justify-center"
                :disabled="demoForm.processing"
                @click="demoForm.post(demoLoginPath)"
              >
                {{ tryDemoLabel }}
              </BaseButton>
              <p v-if="flashError" class="mt-2 text-sm text-red-600">{{ flashError }}</p>
            </div>
          </div>

          <!-- Book guided demo card -->
          <div class="rounded-2xl border border-bone bg-white p-8 shadow-sm lg:p-10">
            <div class="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-navy-900">
              <CalendarDaysIcon class="h-7 w-7 text-coral-400" />
            </div>
            <p class="font-display text-2xl text-fg">{{ ctaLabel }}</p>
            <p class="mt-2 text-sm text-fg-subtle">{{ noCommitment }}</p>

            <div class="mt-6 flex flex-col gap-3">
              <a :href="ctaHref">
                <BaseButton size="lg" variant="secondary" class="w-full justify-center">
                  {{ ctaLabel }}
                </BaseButton>
              </a>
              <a :href="`/${locale}/tarifs`">
                <BaseButton size="lg" variant="ghost" class="w-full justify-center">
                  {{ secondaryLabel }}
                </BaseButton>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
