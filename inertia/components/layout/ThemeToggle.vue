<script setup lang="ts">
import { computed } from 'vue'
import { THEME_PREFERENCES, type ThemePreference } from '#shared/types/theme'
import ThemeIcon from '~/components/layout/ThemeIcon.vue'
import { useT } from '~/composables/use_t'
import { useTheme } from '~/composables/use_theme'

/**
 * Bouton de thème unique du header public : affiche la préférence courante et
 * passe à la suivante au clic (système → clair → sombre → système). Le
 * sélecteur à trois boutons (`ThemeSwitcher`) reste dans le drawer mobile et
 * les réglages, où la place ne manque pas.
 */
const { t } = useT()
const { preference, setTheme } = useTheme()

const LABEL_KEYS: Record<ThemePreference, string> = {
  system: 'common.theme.system',
  light: 'common.theme.light',
  dark: 'common.theme.dark',
}

const next = computed<ThemePreference>(() => {
  const index = THEME_PREFERENCES.indexOf(preference.value)
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length]
})

const label = computed(() => `${t('common.theme.toggle')} · ${t(LABEL_KEYS[preference.value])}`)
</script>

<template>
  <button
    type="button"
    class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-(--radius-control) text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
    :aria-label="label"
    :title="label"
    data-testid="theme-toggle"
    :data-preference="preference"
    @click="setTheme(next)"
  >
    <ThemeIcon :preference="preference" />
  </button>
</template>
