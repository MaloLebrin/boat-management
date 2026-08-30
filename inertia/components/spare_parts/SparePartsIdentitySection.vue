<script setup lang="ts">
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import type { EnginePlateHint } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  boatId: number
  engine: {
    id: number
    brand: string | null
    model: string | null
    catalogBrandSlug: string | null
    serialNumber: string | null
    /** Modèles du catalogue partageant ce code plaque (#575). */
    modelCodeMatches: number
  }
  /**
   * Aides plaque signalétique, servies par le catalogue moteur (#575) : celle
   * de la marque du moteur, ou toutes les aides connues quand la marque n'est
   * pas résolue. Le composant ne filtre plus rien lui-même — le tableau
   * statique de trois marques a disparu avec #575.
   */
  plateHints: EnginePlateHint[]
  canManage: boolean
}>()

const { t } = useT()

/**
 * Le code plaque du moteur couvre plusieurs modèles du catalogue : c'est
 * exactement le cas que l'avertissement « numéro de série » vise, on le dit
 * alors explicitement plutôt que de s'en tenir à la mise en garde générale.
 */
const ambiguousModelCode = computed(() => props.engine.modelCodeMatches > 1)

const missingIdentity = computed(() => !props.engine.model || !props.engine.serialNumber)

const identityRows = computed(() => [
  { label: t('parts.identify.engineCard.brand'), value: props.engine.brand },
  { label: t('parts.identify.engineCard.model'), value: props.engine.model },
  { label: t('parts.identify.engineCard.serial'), value: props.engine.serialNumber },
])
</script>

<template>
  <BaseCard padded>
    <h2 class="text-lg font-semibold text-fg">{{ t('parts.identify.engineCard.title') }}</h2>

    <dl class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div
        v-for="row in identityRows"
        :key="row.label"
        class="rounded-lg border border-border bg-surface-muted/30 p-3"
      >
        <dt class="text-xs font-medium uppercase tracking-wide text-fg-muted">{{ row.label }}</dt>
        <dd class="mt-1 font-mono text-sm" :class="row.value ? 'text-fg' : 'text-fg-subtle'">
          {{ row.value ?? t('parts.identify.engineCard.missing') }}
        </dd>
      </div>
    </dl>

    <div v-if="missingIdentity" class="mt-4">
      <BaseAlert variant="info">
        {{ t('parts.identify.engineCard.missingHint') }}
      </BaseAlert>
      <BaseButton
        v-if="canManage"
        variant="secondary"
        size="sm"
        class="mt-3"
        :href="`/boats/${boatId}/engines/${engine.id}/edit`"
      >
        {{ t('parts.identify.engineCard.editEngine') }}
      </BaseButton>
    </div>

    <BaseAlert variant="warning" :title="t('parts.identify.serialWarning.title')" class="mt-4">
      {{ t('parts.identify.serialWarning.text') }}
      <span v-if="ambiguousModelCode" class="mt-2 block font-medium">
        {{
          t('parts.identify.serialWarning.ambiguous', {
            count: String(engine.modelCodeMatches),
            model: engine.model ?? '',
          })
        }}
      </span>
    </BaseAlert>

    <h3 class="mt-6 font-semibold text-fg">{{ t('parts.identify.plate.title') }}</h3>
    <p class="mt-1 text-sm text-fg-muted">{{ t('parts.identify.plate.intro') }}</p>
    <p v-if="plateHints.length === 0" class="mt-3 text-sm text-fg-muted">
      {{ t('parts.identify.plate.unknownBrand') }}
    </p>
    <ul v-else class="mt-3 space-y-3">
      <li
        v-for="hint in plateHints"
        :key="hint.brandSlug"
        class="rounded-lg border border-border bg-surface p-3"
      >
        <p class="text-sm font-medium text-fg">{{ hint.brandName }}</p>
        <p class="mt-1 text-sm text-fg-muted">{{ t(hint.locationKey) }}</p>
        <p v-if="hint.exampleKey" class="mt-1 text-sm text-fg-muted">{{ t(hint.exampleKey) }}</p>
      </li>
    </ul>
  </BaseCard>
</template>
