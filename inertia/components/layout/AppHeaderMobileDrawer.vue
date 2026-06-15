<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { nextTick, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  isOpen: boolean
  locale: 'en' | 'fr'
  guideHref: string
  isAuthed: boolean
}>()

const emit = defineEmits<{
  close: []
  switchLocale: []
}>()

const { t } = useT()
const closeButtonEl = ref<HTMLButtonElement | null>(null)

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
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
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
      class="fixed right-0 top-0 z-50 h-full w-72 bg-cream shadow-xl md:hidden flex flex-col"
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
            <circle cx="32" cy="32" r="28" stroke="#0b1d2e" stroke-width="2.6" />
            <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#0b1d2e" />
            <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
            <circle cx="32" cy="32" r="2.4" fill="#faf6ee" stroke="#0b1d2e" stroke-width="1.4" />
          </svg>
          <span
            class="font-display text-base leading-none text-fg"
            style="letter-spacing: -0.025em"
          >
            Fleet<em style="font-style: italic; color: #e2674f">Ai</em>
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

      <!-- Nav links -->
      <nav class="flex-1 overflow-y-auto px-4 py-5 space-y-1">
        <Link
          :href="`/${locale}#features`"
          class="block rounded-(--radius-control) px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
          @click="emit('close')"
        >
          {{ t('public.nav.features') }}
        </Link>
        <Link
          :href="`/${locale}/tarifs`"
          class="block rounded-(--radius-control) px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
          @click="emit('close')"
        >
          {{ t('public.nav.pricing') }}
        </Link>
        <Link
          :href="guideHref"
          class="block rounded-(--radius-control) px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
          @click="emit('close')"
        >
          {{ t('public.nav.guide') }}
        </Link>
        <Link
          href="/design-system"
          class="block rounded-(--radius-control) px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
          @click="emit('close')"
        >
          Design system
        </Link>
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
