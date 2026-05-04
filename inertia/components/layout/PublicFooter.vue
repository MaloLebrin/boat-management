<script setup lang="ts">
import { useT } from '~/composables/useT'

const { t } = useT()

const props = defineProps<{
  locale?: 'en' | 'fr'
}>()


const page = usePage<SharedProps>()

const locale = computed<'en' | 'fr'>(() => props.locale ?? page.props.locale ?? 'en')
</script>

<template>
  <footer class="border-t border-abyss-800 bg-abyss-950">
    <div class="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
      <div class="space-y-3">
        <p class="font-display text-sm font-semibold text-white">Fleetide AI</p>
        <p class="text-sm text-abyss-300">
          {{ locale === ‘fr’
          ? ‘Le suivi technique de flotte, avec la clarté de l’IA.’
          : ‘Fleet technical tracking, with AI clarity.’ }}
        </p>
      </div>

      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-abyss-400">Product</p>
        <div class="grid gap-2 text-sm font-semibold text-abyss-300">
          <Link :href="`/${locale}#features`" class="hover:text-white">Features</Link>
          <Link :href="`/${locale}/tarifs`" class="hover:text-white">{{ locale === ‘fr’ ? ‘Tarifs’ : ‘Pricing’ }}</Link>
          <Link href="/design-system" class="hover:text-white">Design system</Link>
        </div>
      </div>

      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-abyss-400">Company</p>
        <div class="grid gap-2 text-sm font-semibold text-abyss-300">
          <a class="hover:text-white" href="#">{{ locale === ‘fr’ ? ‘Contact’ : ‘Contact’ }}</a>
          <a class="hover:text-white" href="#">{{ locale === ‘fr’ ? ‘À propos’ : ‘About’ }}</a>
        </div>
      </div>

      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-abyss-400">Legal</p>
        <div class="grid gap-2 text-sm font-semibold text-abyss-300">
          <a class="hover:text-white" href="#">{{ locale === ‘fr’ ? ‘Confidentialité’ : ‘Privacy’ }}</a>
          <a class="hover:text-white" href="#">{{ locale === ‘fr’ ? ‘Conditions’ : ‘Terms’ }}</a>
        </div>
      </div>
    </div>

    <div class="border-t border-abyss-800">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs font-semibold text-abyss-400">
        <span>© {{ new Date().getFullYear() }} Fleetide AI</span>
        <span>{{ locale === ‘fr’ ? ‘Bilingue FR / EN’ : ‘Bilingual EN / FR’ }}</span>
      </div>
    </div>
  </footer>
</template>
