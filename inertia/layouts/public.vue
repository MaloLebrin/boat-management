<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import AppHeader from '~/components/layout/AppHeader.vue'
import { useT } from '~/composables/use_t'

type SharedProps = {
  locale?: 'en' | 'fr'
  path?: string
}

const page = usePage<SharedProps>()
const { t } = useT()

const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')
const copyrightYear = new Date().getFullYear()

const guideHref = computed(() =>
  locale.value === 'fr' ? '/fr/cout-entretien-bateau' : '/en/boat-maintenance-cost'
)

const simulatorHref = computed(() =>
  locale.value === 'fr' ? '/fr/simulateur-cout-entretien' : '/en/maintenance-cost-simulator'
)

const privacyHref = computed(() => (locale.value === 'fr' ? '/fr/confidentialite' : '/en/privacy'))
</script>

<template>
  <div class="min-h-screen bg-cream text-fg">
    <AppHeader />

    <main class="w-full">
      <slot />
    </main>

    <footer class="border-t border-bone bg-paper">
      <div class="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
        <div class="space-y-3">
          <p class="font-display text-sm text-fg" style="letter-spacing: -0.025em">
            Fleet<em style="font-style: italic; color: #e2674f">Ai</em>
          </p>
          <p class="text-sm text-fg-muted">{{ t('public.footer.tagline') }}</p>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            {{ t('public.footer.product') }}
          </p>
          <div class="grid gap-2 text-sm font-medium text-fg-muted">
            <Link :href="`/${locale}#features`" class="transition-colors hover:text-fg">{{
              t('public.footer.features')
            }}</Link>
            <Link :href="`/${locale}/tarifs`" class="transition-colors hover:text-fg">{{
              t('public.footer.pricing')
            }}</Link>
            <Link :href="simulatorHref" class="transition-colors hover:text-fg">{{
              t('public.footer.simulator')
            }}</Link>
            <Link :href="guideHref" class="transition-colors hover:text-fg">{{
              t('public.footer.guide')
            }}</Link>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            {{ t('public.footer.company') }}
          </p>
          <div class="grid gap-2 text-sm font-medium text-fg-muted">
            <a class="transition-colors hover:text-fg" href="#">{{ t('public.footer.contact') }}</a>
            <a class="transition-colors hover:text-fg" href="#">{{ t('public.footer.about') }}</a>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            {{ t('public.footer.legal') }}
          </p>
          <div class="grid gap-2 text-sm font-medium text-fg-muted">
            <Link :href="privacyHref" class="transition-colors hover:text-fg">{{
              t('public.footer.privacy')
            }}</Link>
            <a class="transition-colors hover:text-fg" href="#">{{ t('public.footer.terms') }}</a>
          </div>
        </div>
      </div>

      <div class="border-t border-bone">
        <div
          class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-xs font-medium text-fg-subtle"
        >
          <span>© {{ copyrightYear }} FleetAi</span>
          <span>{{ t('public.footer.bilingual') }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>
