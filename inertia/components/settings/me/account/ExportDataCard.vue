<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'

/** « Exporter mes données » (#886) : fichier JSON des données de la personne. */
const { t } = useT()
</script>

<template>
  <section>
    <BaseHeading level="2" class="mb-2">{{ t('settings.danger.export.title') }}</BaseHeading>
    <p class="mb-6 text-sm text-fg-muted">{{ t('settings.danger.export.subtitle') }}</p>
    <BaseCard>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-sm text-fg-muted">{{ t('settings.danger.export.hint') }}</p>
        <!-- Téléchargement : une visite Inertia rendrait le fichier comme une page. -->
        <BaseButton
          variant="secondary"
          href="/settings/me/export"
          external-href
          data-testid="export-my-data"
        >
          {{ t('settings.danger.export.action') }}
        </BaseButton>
      </div>
    </BaseCard>
  </section>
</template>
