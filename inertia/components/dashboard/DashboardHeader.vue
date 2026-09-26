<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'

const { t } = useT()
const { formatDateLong } = useDateFormat()

// La date du jour se calcule côté navigateur seulement : rendue au SSR, elle
// pourrait différer de celle du client autour de minuit (mismatch d'hydratation).
const todayLabel = ref<string | null>(null)
onMounted(() => {
  todayLabel.value = formatDateLong(new Date())
})
</script>

<template>
  <!-- En-tête allégé (#828) : titre + date du jour + actions. Le lien « Bateaux → »
       (ghost, #419) a été retiré : la navigation vers la flotte est déjà portée par la
       sidebar, la bottom nav (#492), la carte KPI « Bateaux » et « Vos bateaux ·
       Voir tout ». -->
  <div class="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        {{ t('dashboard.title') }}
      </h1>
      <p class="mt-1 min-h-6 text-sm text-fg-muted sm:text-base" data-testid="dashboard-greeting">
        <template v-if="todayLabel">{{ t('dashboard.greeting', { date: todayLabel }) }}</template>
      </p>
    </div>
    <!-- `ml-auto` : quand le groupe passe sous le titre (mobile), il reste calé à droite
         pour que le panneau du menu « + Créer » (ancré à droite) reste dans l'écran. -->
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
