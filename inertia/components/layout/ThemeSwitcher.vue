<script setup lang="ts">
import { THEME_PREFERENCES, type ThemePreference } from '#shared/types/theme'
import { useT } from '~/composables/use_t'
import { useTheme } from '~/composables/use_theme'

// `onDark` : la sidebar de l'app reste navy-900 dans les deux thèmes, les
// tokens sémantiques (qui basculent) y seraient illisibles.
withDefaults(defineProps<{ tone?: 'surface' | 'onDark' }>(), { tone: 'surface' })

const { t } = useT()
const { preference, setTheme } = useTheme()

const LABEL_KEYS: Record<ThemePreference, string> = {
  system: 'common.theme.system',
  light: 'common.theme.light',
  dark: 'common.theme.dark',
}
</script>

<template>
  <div class="flex items-center gap-1" role="group" :aria-label="t('common.theme.label')">
    <button
      v-for="option in THEME_PREFERENCES"
      :key="option"
      type="button"
      :aria-pressed="preference === option"
      :title="t(LABEL_KEYS[option])"
      :class="[
        'inline-flex h-8 w-8 items-center justify-center rounded-(--radius-control) transition-colors duration-(--motion-fast) cursor-pointer disabled:cursor-not-allowed',
        tone === 'onDark'
          ? preference === option
            ? 'bg-navy-500 text-white'
            : 'text-navy-200 hover:bg-navy-700 hover:text-white'
          : preference === option
            ? 'bg-brand text-on-brand'
            : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
      ]"
      @click="setTheme(option)"
    >
      <!-- Système : demi-cercle plein -->
      <svg
        v-if="option === 'system'"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />
      </svg>
      <!-- Clair : soleil -->
      <svg
        v-else-if="option === 'light'"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        />
      </svg>
      <!-- Sombre : croissant -->
      <svg
        v-else
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
      <span class="sr-only">{{ t(LABEL_KEYS[option]) }}</span>
    </button>
  </div>
</template>
