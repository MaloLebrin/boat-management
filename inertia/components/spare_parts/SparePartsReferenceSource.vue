<script setup lang="ts">
import { computed } from 'vue'
import type { SparePartReferenceRow } from '#shared/types/spare_parts'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'

/**
 * Référence constructeur connue, **toujours accompagnée de sa source** (#575).
 *
 * C'est le seul endroit de l'app qui affiche une référence issue du catalogue :
 * en faire un composant garantit qu'on ne peut pas en afficher une sans dire
 * d'où elle vient — la contrainte `NOT NULL` de `source_label` le garantit en
 * base, ce composant le garantit à l'écran.
 *
 * Une entrée jamais revérifiée (`verifiedAt` vide) le dit explicitement plutôt
 * que de se présenter comme certaine : une turbine commandée sur une mauvaise
 * référence est un aller-retour perdu, souvent en pleine saison.
 *
 * `i18nPrefix` permet au chat public (#634 Phase 2, ton tutoiement) de fournir
 * ses propres libellés — mêmes sous-clés `label`/`sourcePrefix`/`verifiedAt`/
 * `unverified`, l'app connectée garde les siennes par défaut.
 */
const props = withDefaults(
  defineProps<{ reference: SparePartReferenceRow; i18nPrefix?: string }>(),
  { i18nPrefix: 'parts.reference' }
)

const { t } = useT()
const { formatDate } = useDateFormat()

const verifiedLabel = computed(() =>
  props.reference.verifiedAt
    ? t(`${props.i18nPrefix}.verifiedAt`, { date: formatDate(props.reference.verifiedAt) })
    : t(`${props.i18nPrefix}.unverified`)
)
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-muted/30 p-2.5">
    <p class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span class="text-xs font-medium uppercase tracking-wide text-fg-muted">
        {{ t(`${i18nPrefix}.label`) }}
      </span>
      <span class="font-mono text-sm font-medium text-fg">{{ reference.reference }}</span>
    </p>

    <p class="mt-1 text-xs text-fg-muted">
      <template v-if="reference.sourceUrl">
        {{ t(`${i18nPrefix}.sourcePrefix`) }}
        <!-- eslint-disable vue/no-restricted-v-bind -- lien externe (catalogue de la source) ouvert dans un nouvel onglet : un <Link> Inertia intercepterait le clic -->
        <a
          :href="reference.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-brand hover:underline"
        >
          <!-- eslint-enable vue/no-restricted-v-bind -->
          {{ reference.sourceLabel }}
        </a>
      </template>
      <template v-else>
        {{ t(`${i18nPrefix}.sourcePrefix`) }} {{ reference.sourceLabel }}
      </template>
    </p>

    <p class="mt-0.5 text-xs" :class="reference.verifiedAt ? 'text-fg-subtle' : 'text-warning'">
      {{ verifiedLabel }}
    </p>
  </div>
</template>
