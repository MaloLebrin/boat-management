<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useInstrumentIngestToken } from '~/composables/use_instrument_ingest_token'
import { useT } from '~/composables/use_t'
import { INSTRUMENT_INGEST_PATH } from '#shared/constants/instruments'
import type { InstrumentSourceRow } from '#shared/types/instruments'

const props = defineProps<{ boatId: number; source: InstrumentSourceRow }>()

const { t } = useT()
const { formatDate } = useDateFormat()

const confirm = ref<'rotate' | 'revoke' | null>(null)
const url = `/boats/${props.boatId}/instrument-source/ingest-token`

/** Le jeton en clair n'existe que dans le flash de la génération : un rechargement l'efface. */
const freshToken = useInstrumentIngestToken()
const endpoint = computed(() =>
  typeof window === 'undefined'
    ? INSTRUMENT_INGEST_PATH
    : `${window.location.origin}${INSTRUMENT_INGEST_PATH}`
)

function generate() {
  router.post(url, {}, { preserveScroll: true })
}

function revoke() {
  router.delete(url, { preserveScroll: true })
}

function onConfirm() {
  if (confirm.value === 'rotate') generate()
  else if (confirm.value === 'revoke') revoke()
}
</script>

<template>
  <BaseCard padded data-testid="instrument-plugin-token">
    <template #header>
      <p class="text-sm font-semibold text-fg">{{ t('instruments.plugin.title') }}</p>
    </template>
    <p class="mb-4 text-sm text-fg-muted">{{ t('instruments.plugin.description') }}</p>

    <div class="space-y-4">
      <BaseInput
        :model-value="endpoint"
        :label="t('instruments.plugin.endpoint')"
        name="ingestEndpoint"
        readonly
      />

      <div v-if="freshToken" data-testid="instrument-plugin-fresh-token">
        <BaseInput
          :model-value="freshToken"
          :label="t('instruments.plugin.token')"
          :hint="t('instruments.plugin.tokenOnce')"
          name="ingestToken"
          autocomplete="off"
          readonly
        />
      </div>

      <p class="text-sm text-fg-muted" data-testid="instrument-plugin-status">
        {{
          source.hasIngestToken && source.ingestTokenIssuedAt
            ? t('instruments.plugin.status', { date: formatDate(source.ingestTokenIssuedAt) })
            : t('instruments.plugin.none')
        }}
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <BaseButton v-if="!source.hasIngestToken" type="button" @click="generate">
          {{ t('instruments.plugin.generate') }}
        </BaseButton>
        <template v-else>
          <BaseButton type="button" variant="secondary" @click="confirm = 'rotate'">
            {{ t('instruments.plugin.rotate') }}
          </BaseButton>
          <BaseButton type="button" variant="danger" @click="confirm = 'revoke'">
            {{ t('instruments.plugin.revoke') }}
          </BaseButton>
        </template>
      </div>
    </div>

    <BaseConfirmModal
      :open="confirm !== null"
      :title="
        t(
          confirm === 'revoke' ? 'instruments.plugin.revokeTitle' : 'instruments.plugin.rotateTitle'
        )
      "
      :message="
        t(
          confirm === 'revoke'
            ? 'instruments.plugin.revokeMessage'
            : 'instruments.plugin.rotateMessage'
        )
      "
      :confirm-label="
        t(confirm === 'revoke' ? 'instruments.plugin.revoke' : 'instruments.plugin.rotate')
      "
      @update:open="(value: boolean) => !value && (confirm = null)"
      @confirm="onConfirm"
    />
  </BaseCard>
</template>
