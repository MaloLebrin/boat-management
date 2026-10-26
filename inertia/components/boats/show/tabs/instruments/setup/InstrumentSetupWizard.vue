<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import InstrumentSetupStepBrowser from '~/components/boats/show/tabs/instruments/setup/InstrumentSetupStepBrowser.vue'
import InstrumentSetupStepDone from '~/components/boats/show/tabs/instruments/setup/InstrumentSetupStepDone.vue'
import InstrumentSetupStepEngines from '~/components/boats/show/tabs/instruments/setup/InstrumentSetupStepEngines.vue'
import InstrumentSetupStepHardware from '~/components/boats/show/tabs/instruments/setup/InstrumentSetupStepHardware.vue'
import InstrumentSetupStepPath from '~/components/boats/show/tabs/instruments/setup/InstrumentSetupStepPath.vue'
import InstrumentSetupStepPlugin from '~/components/boats/show/tabs/instruments/setup/InstrumentSetupStepPlugin.vue'
import InstrumentSetupStepper from '~/components/boats/show/tabs/instruments/setup/InstrumentSetupStepper.vue'
import { useInstrumentSetup } from '~/composables/use_instrument_setup'
import { useT } from '~/composables/use_t'
import type { BoatShowEngine } from '~/types/boat_show'
import type {
  InstrumentProbeInventory,
  InstrumentSetupHardware,
  InstrumentSetupPath,
  InstrumentsTabProps,
} from '#shared/types/instruments'

/**
 * Assistant « Connecter mon bateau » (#1023) : remplace l'état vide pour un
 * admin sans source ; une fois la source créée, reste replié au-dessus des
 * jauges jusqu'à la fin du parcours, puis se masque (réouvrable).
 */
const props = defineProps<{
  boatId: number
  instruments: InstrumentsTabProps
  engines: BoatShowEngine[]
  streamOpen: boolean
}>()

const { t } = useT()
const probed = ref<InstrumentProbeInventory | null>(null)
const source = computed(() => props.instruments.source)

const setup = useInstrumentSetup({
  boatId: () => props.boatId,
  source: () => source.value,
  engines: () => props.engines,
  latestPaths: () => props.instruments.latest.map((entry) => entry.path),
  probedEngineIds: () => probed.value?.engineIds ?? [],
  streamOpen: () => props.streamOpen,
})

/**
 * Sans source il remplace l'état vide ; ensuite il reste déplié tant que le
 * parcours n'est pas terminé (c'est là que se joue l'installation), l'admin
 * pouvant le replier au-dessus des jauges.
 */
const userExpanded = ref<boolean | null>(null)
const expanded = computed(() => !source.value || (userExpanded.value ?? true))
/**
 * Une source déjà au vert à l'ouverture de l'onglet n'a plus besoin de
 * l'assistant ; celui qui vient d'être parcouru reste jusqu'à « Masquer ».
 */
const startedIncomplete = !setup.completed.value
const reopened = ref(false)
const hidden = computed(
  () =>
    Boolean(source.value) &&
    !reopened.value &&
    (setup.stored.value.dismissed || (setup.completed.value && !startedIncomplete))
)

function selectHardware(value: InstrumentSetupHardware) {
  setup.update({ hardware: value })
}
function selectPath(value: InstrumentSetupPath) {
  setup.update({ path: value })
}
function reopen() {
  setup.update({ dismissed: false })
  reopened.value = true
  userExpanded.value = true
}
</script>

<template>
  <div v-if="hidden" class="flex justify-end">
    <BaseButton
      type="button"
      variant="secondary"
      size="sm"
      data-testid="instrument-setup-reopen"
      @click="reopen"
    >
      {{ t('instruments.setup.reopen') }}
    </BaseButton>
  </div>
  <BaseCard v-else padded data-testid="instrument-setup">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-fg">{{ t('instruments.setup.title') }}</p>
          <p class="text-xs text-fg-muted">
            {{ source ? t('instruments.setup.inProgress') : t('instruments.setup.subtitle') }}
          </p>
        </div>
        <BaseButton
          v-if="source"
          type="button"
          variant="secondary"
          size="sm"
          :aria-expanded="expanded"
          data-testid="instrument-setup-toggle"
          @click="userExpanded = !expanded"
        >
          {{ expanded ? t('instruments.setup.collapse') : t('instruments.setup.expand') }}
        </BaseButton>
      </div>
    </template>

    <InstrumentSetupStepper
      v-if="expanded"
      :steps="setup.steps.value"
      :open-key="setup.openStep.value"
      @select="setup.openStepManually"
    >
      <template #hardware>
        <InstrumentSetupStepHardware
          :hardware="setup.stored.value.hardware"
          @select="selectHardware"
        />
      </template>
      <template #path>
        <InstrumentSetupStepPath :path="setup.path.value" @select="selectPath" />
      </template>
      <template #connect>
        <InstrumentSetupStepPlugin
          v-if="setup.path.value !== 'app'"
          :boat-id="boatId"
          :source="source"
          :hardware="setup.stored.value.hardware"
          :waiting="setup.waiting.value"
          :timed-out="setup.timedOut.value"
          :received="setup.firstBatchAt.value !== null"
          @wait="setup.startWaiting"
        />
        <InstrumentSetupStepBrowser
          v-else
          :boat-id="boatId"
          :source="source"
          :hardware="setup.stored.value.hardware"
          :pending-test="setup.stored.value.pendingTest"
          @update:pending-test="setup.update({ pendingTest: $event })"
          @probed="probed = $event"
        />
      </template>
      <template #engines>
        <InstrumentSetupStepEngines
          :boat-id="boatId"
          :engines="engines"
          :detected-ids="setup.detectedEngineIds.value"
        />
      </template>
      <template #done>
        <InstrumentSetupStepDone
          :first-readings="instruments.latest.length"
          @dismiss="setup.update({ dismissed: true })"
        />
      </template>
    </InstrumentSetupStepper>
  </BaseCard>
</template>
