<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import { useT } from '~/composables/use_t'
import { useTheme } from '~/composables/use_theme'
import type { ThemePreference } from '#shared/types/theme'

const { t } = useT()
const { preference, setTheme } = useTheme()

const options: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: t('settings.theme.system') },
  { value: 'light', label: t('settings.theme.light') },
  { value: 'dark', label: t('settings.theme.dark') },
]

// Contrairement à la langue, le thème s'applique à l'aperçu : pas de bouton
// « Enregistrer », le choix est appliqué et persisté au clic.
function onSelect(value: string | number) {
  setTheme(value as ThemePreference)
}
</script>

<template>
  <section>
    <BaseHeading level="2" class="mb-2">{{ t('settings.theme.title') }}</BaseHeading>
    <p class="mb-6 text-sm text-fg-muted">{{ t('settings.theme.subtitle') }}</p>
    <BaseCard>
      <span id="theme-label" class="mb-2 block text-sm font-medium text-fg">
        {{ t('settings.theme.label') }}
      </span>
      <BaseSegmentedControl
        :model-value="preference"
        :options="options"
        aria-labelledby="theme-label"
        @update:model-value="onSelect"
      />
      <p class="mt-3 text-xs text-fg-subtle">{{ t('settings.theme.autoSaved') }}</p>
    </BaseCard>
  </section>
</template>
