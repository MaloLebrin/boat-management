<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed, nextTick, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import ThemeSwitcher from '~/components/layout/ThemeSwitcher.vue'
import { useT } from '~/composables/use_t'
import { usePublicNav } from '~/composables/use_public_nav'

const props = defineProps<{
  isOpen: boolean
  locale: 'en' | 'fr'
  isAuthed: boolean
}>()

const emit = defineEmits<{
  close: []
  switchLocale: []
}>()

const { t } = useT()
const closeButtonEl = ref<HTMLButtonElement | null>(null)

// Mêmes groupes et liens que le header desktop (source unique : use_public_nav).
// Les outils gratuits, liens directs sur desktop, gardent ici leur intertitre.
const localeRef = computed(() => props.locale)
const { productGroups, toolLinks, topLinks } = usePublicNav(localeRef)

const drawerGroups = computed(() => [
  ...productGroups.value,
  { labelKey: 'public.nav.productToolsGroup', links: toolLinks.value },
])

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      await nextTick()
      closeButtonEl.value?.focus()
    }
  }
)
</script>

<template>
  <!-- Overlay -->
  <Transition name="drawer-overlay">
    <button
      v-if="isOpen"
      type="button"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
      :aria-label="t('nav.closeMenu')"
      @click="emit('close')"
    />
  </Transition>

  <!-- Drawer panel -->
  <Transition name="drawer-panel">
    <div
      v-if="isOpen"
      id="public-nav-drawer"
      role="dialog"
      aria-modal="true"
      class="fixed right-0 top-0 z-50 h-full w-72 bg-cream shadow-xl lg:hidden flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-bone">
        <Link :href="`/${locale}`" class="inline-flex items-center gap-2.5" @click="emit('close')">
          <svg
            width="32"
            height="32"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="32" cy="32" r="28" stroke="var(--color-fg)" stroke-width="2.6" />
            <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="var(--color-fg)" />
            <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="var(--color-coral-500)" />
            <circle
              cx="32"
              cy="32"
              r="2.4"
              fill="var(--color-surface)"
              stroke="var(--color-fg)"
              stroke-width="1.4"
            />
          </svg>
          <span
            class="font-display text-base leading-none text-fg"
            style="letter-spacing: -0.025em"
          >
            Fleet<em class="italic text-coral-500">Ai</em>
          </span>
        </Link>
        <button
          ref="closeButtonEl"
          type="button"
          class="inline-flex items-center justify-center w-9 h-9 rounded-(--radius-control) text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
          :aria-label="t('nav.closeMenu')"
          @click="emit('close')"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Nav links : fonctionnalités puis outils gratuits sous intertitres, puis liens de premier niveau -->
      <nav class="flex-1 overflow-y-auto px-4 py-5">
        <div v-for="group in drawerGroups" :key="group.labelKey" class="mb-4">
          <p class="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            {{ t(group.labelKey) }}
          </p>
          <Link
            v-for="link in group.links"
            :key="link.href"
            :href="link.href"
            class="block rounded-(--radius-control) px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
            @click="emit('close')"
          >
            {{ t(link.labelKey) }}
          </Link>
        </div>
        <div class="space-y-1 border-t border-bone pt-4">
          <Link
            v-for="link in topLinks"
            :key="link.href"
            :href="link.href"
            class="block rounded-(--radius-control) px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
            @click="emit('close')"
          >
            {{ t(link.labelKey) }}
          </Link>
        </div>
      </nav>

      <!-- Footer -->
      <div class="border-t border-bone px-4 py-4 space-y-3">
        <button
          type="button"
          class="inline-flex h-9 w-full items-center justify-center rounded-(--radius-control) px-3 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
          @click="emit('switchLocale')"
        >
          {{ locale === 'en' ? 'FR' : 'EN' }}
        </button>
        <div class="flex justify-center">
          <ThemeSwitcher />
        </div>
        <template v-if="isAuthed">
          <Link href="/dashboard" class="block" @click="emit('close')">
            <BaseButton size="sm" class="w-full">Dashboard</BaseButton>
          </Link>
        </template>
        <template v-else>
          <Link href="/login" class="block" @click="emit('close')">
            <BaseButton variant="ghost" size="sm" class="w-full">{{
              t('public.actions.login')
            }}</BaseButton>
          </Link>
          <Link href="/signup" class="block" @click="emit('close')">
            <BaseButton size="sm" class="w-full">{{ t('public.actions.tryFree') }}</BaseButton>
          </Link>
        </template>
      </div>
    </div>
  </Transition>
</template>
