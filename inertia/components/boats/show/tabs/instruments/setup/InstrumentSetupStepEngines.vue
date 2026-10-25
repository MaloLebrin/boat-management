<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowEngine } from '~/types/boat_show'

const props = defineProps<{ boatId: number; engines: BoatShowEngine[]; detectedIds: string[] }>()

const { t } = useT()

function label(engine: BoatShowEngine): string {
  return (
    [engine.brand, engine.model].filter(Boolean).join(' ') ||
    t('instruments.setup.engines.fallback', { id: engine.id })
  )
}

/** `''` détache le moteur (le serveur lit `null` ou vide comme « détacher »). */
function link(engine: BoatShowEngine, value: string | number) {
  router.patch(
    `/boats/${props.boatId}/engines/${engine.id}/instrument-key`,
    { instrumentKey: value === '' ? null : String(value) },
    { preserveScroll: true }
  )
}

function optionsFor(engine: BoatShowEngine) {
  const ids = new Set(props.detectedIds)
  if (engine.instrumentKey) ids.add(engine.instrumentKey)
  return [...ids].map((id) => ({ value: id, label: id }))
}
</script>

<template>
  <div class="space-y-4" data-testid="instrument-setup-engines">
    <p v-if="engines.length === 0" class="text-sm text-fg-muted">
      {{ t('instruments.setup.engines.none') }}
    </p>
    <template v-else>
      <p class="text-sm text-fg-muted">
        {{
          detectedIds.length > 0
            ? t('instruments.setup.engines.intro')
            : t('instruments.setup.engines.noneDetected')
        }}
      </p>
      <BaseSelect
        v-for="engine in engines"
        :key="engine.id"
        :model-value="engine.instrumentKey ?? ''"
        :label="label(engine)"
        :name="`engineKey${engine.id}`"
        :options="optionsFor(engine)"
        :placeholder="t('instruments.setup.engines.unlinked')"
        allow-empty
        :data-testid="`instrument-setup-engine-${engine.id}`"
        @update:model-value="link(engine, $event)"
      />
    </template>
  </div>
</template>
