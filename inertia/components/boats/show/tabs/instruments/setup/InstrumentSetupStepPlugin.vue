<script setup lang="ts">
import { router, useForm } from '@inertiajs/vue3'
import { computed, onMounted, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCodeBlock from '~/components/base/BaseCodeBlock.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import InstrumentSetupWaiting from '~/components/boats/show/tabs/instruments/setup/InstrumentSetupWaiting.vue'
import { useInstrumentIngestToken } from '~/composables/use_instrument_ingest_token'
import { useT } from '~/composables/use_t'
import { needsFullReloadForCsp } from '~/lib/signalk/probe'
import {
  INSTRUMENT_SETUP_DEFAULT_URLS,
  INSTRUMENT_SETUP_PLUGIN_PLACEHOLDER_URL,
} from '#shared/constants/instruments'
import { signalkPluginInstallCommand } from '#shared/helpers/instruments'
import type { InstrumentSetupHardware, InstrumentSourceRow } from '#shared/types/instruments'

const props = defineProps<{
  boatId: number
  source: InstrumentSourceRow | null
  hardware: InstrumentSetupHardware | null
  waiting: boolean
  timedOut: boolean
  received: boolean
}>()
const emit = defineEmits<{ wait: [] }>()

const { t } = useT()
const freshToken = useInstrumentIngestToken()
const tokenUrl = computed(() => `/boats/${props.boatId}/instrument-source/ingest-token`)

const form = useForm({
  baseUrl: props.source?.baseUrl ?? INSTRUMENT_SETUP_DEFAULT_URLS[props.hardware ?? 'none'],
})

const origin = computed(() => (typeof window === 'undefined' ? '' : (window.location.origin ?? '')))
const command = computed(() => signalkPluginInstallCommand(origin.value, freshToken.value))

function saveSource() {
  const baseUrl = form.baseUrl.trim() || INSTRUMENT_SETUP_PLUGIN_PLACEHOLDER_URL
  form
    .transform(() => ({ baseUrl, enabled: true }))
    .put(`/boats/${props.boatId}/instrument-source`, {
      preserveScroll: true,
      onSuccess: () => {
        // CSP par document (D10) : première source ou nouvelle origine → rechargement complet.
        if (needsFullReloadForCsp(props.source?.baseUrl ?? null, baseUrl)) {
          window.location.assign(`/boats/${props.boatId}?tab=instruments`)
        }
      },
    })
}

function generate() {
  router.post(tokenUrl.value, {}, { preserveScroll: true })
}

onMounted(() => {
  if (props.source?.hasIngestToken) emit('wait')
})
// Le jeton vient d'être généré : le plugin n'est pas encore installé, on guette son premier lot.
watch(
  () => props.source?.hasIngestToken,
  (has) => has && emit('wait')
)
</script>

<template>
  <div class="space-y-4" data-testid="instrument-setup-plugin">
    <form v-if="!source" class="space-y-3" @submit.prevent="saveSource">
      <BaseInput
        v-model="form.baseUrl"
        :label="t('instruments.setup.plugin.address')"
        :hint="t('instruments.setup.plugin.addressHint')"
        :errors="form.errors"
        error-key="baseUrl"
        name="setupBaseUrl"
        type="url"
        inputmode="url"
        placeholder="http://openplotter.local:3000"
      />
      <BaseButton type="submit" :disabled="form.processing">
        {{ t('instruments.setup.plugin.save') }}
      </BaseButton>
    </form>

    <template v-else>
      <BaseButton
        v-if="!source.hasIngestToken"
        type="button"
        data-testid="instrument-setup-generate"
        @click="generate"
      >
        {{ t('instruments.setup.plugin.generate') }}
      </BaseButton>
      <template v-else>
        <p class="text-sm text-fg-muted">{{ t('instruments.setup.plugin.commandIntro') }}</p>
        <BaseCodeBlock
          :code="command"
          language="bash"
          :label="t('instruments.setup.plugin.commandLabel')"
          wrap
        />
        <div v-if="!freshToken" class="space-y-2" data-testid="instrument-setup-token-lost">
          <p class="text-sm text-fg-muted">{{ t('instruments.setup.plugin.tokenLost') }}</p>
          <BaseButton type="button" variant="secondary" @click="generate">
            {{ t('instruments.setup.plugin.regenerate') }}
          </BaseButton>
        </div>
        <details class="text-sm text-fg-muted">
          <summary class="cursor-pointer font-medium text-fg">
            {{ t('instruments.setup.plugin.manualTitle') }}
          </summary>
          <p class="mt-2">{{ t('instruments.setup.plugin.manualBody') }}</p>
        </details>
        <InstrumentSetupWaiting
          :waiting="waiting"
          :timed-out="timedOut"
          :received="received"
          @retry="emit('wait')"
        />
      </template>
    </template>
  </div>
</template>
