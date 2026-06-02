<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface SidebarContact {
  icon: string
  label: string
  sub: string
}

defineProps<{
  eyebrow: string
  title: string
  subjects: string[]
  firstNameLabel: string
  lastNameLabel: string
  emailLabel: string
  orgLabel: string
  fleetSizeLabel: string
  messageLabel: string
  messagePlaceholder: string
  privacyText: string
  privacyLinkLabel: string
  submitLabel: string
  responseTime: string
  otherMeansTitle: string
  sidebarContacts: SidebarContact[]
  ctaTitle: string
  ctaSubtitle: string
  ctaButton: string
}>()

const { el, isVisible } = useScrollReveal()
const selectedSubject = ref('Demo')
const selectedSize = ref('5-20')
const fleetSizes = ['1-4', '5-20', '20+']
</script>

<template>
  <section
    :ref="(r) => (el = r as HTMLElement)"
    class="reveal bg-paper px-6 py-20 lg:px-8"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <!-- Form card -->
        <div class="rounded-2xl border border-bone bg-white p-8 shadow-sm">
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            {{ eyebrow }}
          </p>
          <h2 class="mt-2 font-display text-3xl leading-tight text-fg lg:text-4xl">{{ title }}</h2>

          <div class="mt-8 space-y-5">
            <!-- Subject pills -->
            <div>
              <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-fg-subtle">
                Sujet
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="s in subjects"
                  :key="s"
                  type="button"
                  :class="[
                    'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    selectedSubject === s
                      ? 'border-navy-900 bg-cream font-semibold text-fg'
                      : 'border-bone bg-white text-fg-muted hover:bg-cream/50',
                  ]"
                  @click="selectedSubject = s"
                >
                  {{ s }}
                </button>
              </div>
            </div>

            <!-- Name row -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-fg-subtle"
                >
                  {{ firstNameLabel }}
                </label>
                <input
                  type="text"
                  placeholder="Marc"
                  class="w-full rounded-xl border border-bone bg-cream px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-navy-900"
                />
              </div>
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-fg-subtle"
                >
                  {{ lastNameLabel }}
                </label>
                <input
                  type="text"
                  placeholder="Lefèvre"
                  class="w-full rounded-xl border border-bone bg-cream px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-navy-900"
                />
              </div>
            </div>

            <!-- Email -->
            <div>
              <label
                class="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-fg-subtle"
              >
                {{ emailLabel }}
              </label>
              <input
                type="email"
                placeholder="marc@marina-bleue.fr"
                class="w-full rounded-xl border border-bone bg-cream px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-navy-900"
              />
            </div>

            <!-- Org + Fleet size -->
            <div class="grid grid-cols-[1.5fr_1fr] gap-4">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-fg-subtle"
                >
                  {{ orgLabel }}
                </label>
                <input
                  type="text"
                  placeholder="Marina Bleue"
                  class="w-full rounded-xl border border-bone bg-cream px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-navy-900"
                />
              </div>
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-fg-subtle"
                >
                  {{ fleetSizeLabel }}
                </label>
                <div class="flex gap-2">
                  <button
                    v-for="s in fleetSizes"
                    :key="s"
                    type="button"
                    :class="[
                      'flex-1 rounded-xl border py-3 text-sm font-medium transition-colors',
                      selectedSize === s
                        ? 'border-navy-900 bg-cream font-semibold text-fg'
                        : 'border-bone bg-white text-fg-muted hover:bg-cream/50',
                    ]"
                    @click="selectedSize = s"
                  >
                    {{ s }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Message -->
            <div>
              <label
                class="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-fg-subtle"
              >
                {{ messageLabel }}
              </label>
              <textarea
                :placeholder="messagePlaceholder"
                rows="5"
                class="w-full resize-y rounded-xl border border-bone bg-cream px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-navy-900"
              />
            </div>

            <!-- Privacy -->
            <label class="flex items-start gap-3 text-xs leading-relaxed text-fg-subtle">
              <input type="checkbox" class="mt-0.5 accent-navy-900" checked />
              <span>
                {{ privacyText }}
                <a href="/privacy" class="text-navy-900 underline">{{ privacyLinkLabel }}</a
                >.
              </span>
            </label>

            <BaseButton href="#" class="w-full justify-center">{{ submitLabel }}</BaseButton>
            <p class="text-center text-xs text-fg-subtle">{{ responseTime }}</p>
          </div>
        </div>

        <!-- Sticky sidebar -->
        <div class="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <!-- Contact info card -->
          <div class="rounded-2xl border border-bone bg-white p-6">
            <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
              {{ otherMeansTitle }}
            </p>
            <div class="mt-5 space-y-4">
              <div v-for="c in sidebarContacts" :key="c.label" class="flex items-start gap-3">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bone text-sm"
                >
                  {{ c.icon }}
                </div>
                <div>
                  <p class="font-mono text-sm font-medium text-fg">{{ c.label }}</p>
                  <p class="text-xs text-fg-subtle">{{ c.sub }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Navy CTA card -->
          <div class="relative overflow-hidden rounded-2xl bg-navy-900 p-6">
            <svg
              viewBox="0 0 100 100"
              class="pointer-events-none absolute right-0 top-0 h-44 w-44 -translate-y-1/3 translate-x-1/3 opacity-10"
            >
              <path d="M50 5 L65 50 L50 60 L35 50 Z" fill="#faf6ee" />
              <path d="M50 95 L65 50 L50 40 L35 50 Z" fill="#e2674f" />
            </svg>
            <h3 class="relative font-display text-2xl leading-tight text-white">
              {{ ctaTitle }}
            </h3>
            <p class="relative mt-2 text-sm text-white/60">{{ ctaSubtitle }}</p>
            <BaseButton
              href="/signup"
              class="relative mt-5 w-full justify-center bg-white! text-navy-900! hover:bg-cream!"
            >
              {{ ctaButton }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
