<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import BaseButton from '~/components/base/BaseButton.vue';

const props = defineProps<{
  locale?: 'en' | 'fr'
  path?: string
}>()

type SharedProps = {
  locale?: 'en' | 'fr'
  path?: string
  user?: unknown
}

const page = usePage<SharedProps>()

const locale = computed<'en' | 'fr'>(() => props.locale ?? page.props.locale ?? 'en')
const path = computed(() => props.path ?? page.props.path ?? '')
const isAuthed = computed(() => Boolean(page.props.user))

const otherLocale = computed(() => (locale.value === 'en' ? 'fr' : 'en'))
const otherHref = computed(() => `/${otherLocale.value}${path.value || ''}`)
</script>

<template>
  <div class="min-h-screen bg-cream text-fg">
    <!-- Header crème clair — style marketing -->
    <header class="sticky top-0 z-40 border-b border-bone bg-cream/95 backdrop-blur-sm">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between">
        <!-- Logo -->
        <Link :href="`/${locale}`"
          class="inline-flex items-center gap-2.5 transition-opacity duration-(--motion-fast) hover:opacity-80">
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true">
            <circle cx="32" cy="32" r="28" stroke="#0b1d2e" stroke-width="2.6" />
            <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#0b1d2e" />
            <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
            <circle cx="32" cy="32" r="2.4" fill="#faf6ee" stroke="#0b1d2e" stroke-width="1.4" />
          </svg>
          <span class="font-display text-lg leading-none text-fg" style="letter-spacing:-0.025em">Fleet<em
              style="font-style:italic;color:#e2674f">Ai</em></span>
        </Link>

        <!-- Nav -->
        <nav class="hidden items-center gap-1 md:flex">
          <Link :href="`/${locale}#features`"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-paper hover:text-fg">
            {{ locale === 'fr' ? 'Fonctionnalités' : 'Features' }}
          </Link>
          <Link :href="`/${locale}/tarifs`"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-paper hover:text-fg">
            {{ locale === 'fr' ? 'Tarifs' : 'Pricing' }}
          </Link>
          <Link href="/design-system"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-paper hover:text-fg">
            Design system</Link>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <Link :href="otherHref"
            class="inline-flex h-9 items-center justify-center rounded-(--radius-control) px-3 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg">
            {{ locale === 'en' ? 'FR' : 'EN' }}
          </Link>
          <template v-if="isAuthed">
            <a href="/dashboard">
              <BaseButton size="sm">Dashboard</BaseButton>
            </a>
          </template>
          <template v-else>
            <a href="/login">
              <BaseButton variant="ghost" size="sm">
                {{ locale === 'fr' ? 'Connexion' : 'Login' }}
              </BaseButton>
            </a>
            <a href="/signup">
              <BaseButton size="sm">
                {{ locale === 'fr' ? 'Essayer gratuitement' : 'Try free' }}
              </BaseButton>
            </a>
          </template>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="mx-auto w-full px-6 py-10">
      <slot />
    </main>

    <!-- Footer papier chaud -->
    <footer class="border-t border-bone bg-paper">
      <div class="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
        <div class="space-y-3">
          <p class="font-display text-sm text-fg" style="letter-spacing:-0.025em">Fleet<em
              style="font-style:italic;color:#e2674f">Ai</em></p>
          <p class="text-sm text-fg-muted">
            {{ locale === 'fr'
              ? 'La maintenance maritime, sans douleur.'
              : 'Maritime fleet maintenance, made simple.' }}
          </p>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            {{ locale === 'fr' ? 'Produit' : 'Product' }}
          </p>
          <div class="grid gap-2 text-sm font-medium text-fg-muted">
            <Link :href="`/${locale}#features`" class="transition-colors hover:text-fg">
              {{ locale === 'fr' ? 'Fonctionnalités' : 'Features' }}
            </Link>
            <Link :href="`/${locale}/tarifs`" class="transition-colors hover:text-fg">
              {{ locale === 'fr' ? 'Tarifs' : 'Pricing' }}
            </Link>
            <Link href="/design-system" class="transition-colors hover:text-fg">Design system</Link>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            {{ locale === 'fr' ? 'Entreprise' : 'Company' }}
          </p>
          <div class="grid gap-2 text-sm font-medium text-fg-muted">
            <a class="transition-colors hover:text-fg" href="#">{{ locale === 'fr' ? 'Contact' : 'Contact' }}</a>
            <a class="transition-colors hover:text-fg" href="#">{{ locale === 'fr' ? 'À propos' : 'About' }}</a>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            {{ locale === 'fr' ? 'Légal' : 'Legal' }}
          </p>
          <div class="grid gap-2 text-sm font-medium text-fg-muted">
            <a class="transition-colors hover:text-fg" href="#">{{ locale === 'fr' ? 'Confidentialité' : 'Privacy'
            }}</a>
            <a class="transition-colors hover:text-fg" href="#">{{ locale === 'fr' ? 'Conditions' : 'Terms' }}</a>
          </div>
        </div>
      </div>

      <div class="border-t border-bone">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-xs font-medium text-fg-subtle">
          <span>© {{ new Date().getFullYear() }} FleetAi</span>
          <span>{{ locale === 'fr' ? 'Bilingue FR/EN · Hébergé en UE' : 'Bilingual EN/FR · EU-hosted' }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>
