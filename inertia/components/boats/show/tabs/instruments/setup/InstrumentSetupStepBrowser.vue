<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import InstrumentSetupDiagnostic from '~/components/boats/show/tabs/instruments/setup/InstrumentSetupDiagnostic.vue'
import { useT } from '~/composables/use_t'
import { toAppLocale } from '#shared/helpers/locale_path'
import { installSignalKPath } from '~/lib/signalk/install_page'
import { needsFullReloadForCsp, probeSignalKServer } from '~/lib/signalk/probe'
import { INSTRUMENT_SETUP_DEFAULT_URLS } from '#shared/constants/instruments'
import type {
  InstrumentProbeInventory,
  InstrumentProbeResult,
  InstrumentSetupHardware,
  InstrumentSourceConnection,
} from '#shared/types/instruments'

const props = defineProps<{
  boatId: number
  source: InstrumentSourceConnection | null
  hardware: InstrumentSetupHardware | null
  pendingTest: boolean
}>()
const emit = defineEmits<{
  'update:pendingTest': [value: boolean]
  'probed': [inventory: InstrumentProbeInventory | null]
}>()

const { t, locale } = useT()
const form = useForm({
  baseUrl: props.source?.baseUrl ?? INSTRUMENT_SETUP_DEFAULT_URLS[props.hardware ?? 'none'],
  token: '',
})
const result = ref<InstrumentProbeResult | null>(null)
const testing = ref(false)
const installUrl = computed(() => installSignalKPath(toAppLocale(locale.value), 'https'))

function pageProtocol(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.protocol
}

async function runProbe(baseUrl: string, token: string | null, preflight = false) {
  testing.value = !preflight
  result.value = await probeSignalKServer({
    baseUrl,
    token,
    pageProtocol: pageProtocol(),
    fetch: (input, init) => fetch(input, init),
    preflight,
  })
  testing.value = false
  emit('probed', result.value.ok ? result.value.inventory : null)
  return result.value
}

async function submit() {
  // Pré-vol local : adresse invalide ou contenu mixte arrêtés sans réseau ni enregistrement.
  const pre = await runProbe(form.baseUrl, null, true)
  if (!pre.ok) return
  const previous = props.source?.baseUrl ?? null
  const token = form.token.trim()
  form
    .transform((data) => ({
      baseUrl: data.baseUrl,
      enabled: true,
      ...(token ? { token } : {}),
    }))
    .put(`/boats/${props.boatId}/instrument-source`, {
      preserveScroll: true,
      onSuccess: () => {
        if (needsFullReloadForCsp(previous, form.baseUrl)) {
          // La CSP est posée par document : on retestera au retour.
          emit('update:pendingTest', true)
          window.location.assign(`/boats/${props.boatId}?tab=instruments`)
          return
        }
        void runProbe(form.baseUrl, token || props.source?.token || null)
      },
    })
}

// Le drapeau n'est lu dans `localStorage` qu'après le montage : on le guette
// plutôt que de le lire une fois.
watch(
  () => props.pendingTest,
  (pending) => {
    if (!pending || !props.source) return
    emit('update:pendingTest', false)
    void runProbe(props.source.baseUrl, props.source.token)
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-4" data-testid="instrument-setup-browser">
    <ul class="list-disc space-y-1 pl-5 text-sm text-fg-muted">
      <li>{{ t('instruments.setup.browser.securityNote') }}</li>
      <li>{{ t('instruments.setup.browser.readOnlyNote') }}</li>
      <li>
        {{ t('instruments.setup.browser.httpsNote') }}
        <!-- eslint-disable vue/no-restricted-v-bind -- page publique : nouvel onglet pour ne pas quitter l'assistant -->
        <a
          :href="installUrl"
          target="_blank"
          rel="noopener"
          class="font-medium text-brand underline"
        >
          {{ t('instruments.setup.browser.httpsLink') }}
        </a>
        <!-- eslint-enable vue/no-restricted-v-bind -->
      </li>
    </ul>
    <form class="space-y-3" @submit.prevent="submit">
      <BaseInput
        v-model="form.baseUrl"
        :label="t('instruments.form.baseUrl')"
        :hint="t('instruments.form.baseUrlHint')"
        :errors="form.errors"
        error-key="baseUrl"
        name="setupBrowserBaseUrl"
        type="url"
        inputmode="url"
        required
      />
      <BaseInput
        v-model="form.token"
        :label="t('instruments.form.token')"
        :hint="source?.hasToken ? t('instruments.form.tokenSet') : t('instruments.form.tokenHint')"
        :errors="form.errors"
        error-key="token"
        name="setupBrowserToken"
        type="password"
        autocomplete="off"
      />
      <BaseButton
        type="submit"
        :disabled="form.processing || testing"
        data-testid="instrument-setup-save-test"
      >
        {{ t('instruments.setup.browser.saveTest') }}
      </BaseButton>
    </form>
    <InstrumentSetupDiagnostic :result="result" :testing="testing" />
  </div>
</template>
