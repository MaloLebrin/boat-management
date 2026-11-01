<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowEngine } from '~/types/boat_show'
import type { InstrumentMappingProposal } from '#shared/types/instruments'

const props = defineProps<{
  boatId: number
  engines: BoatShowEngine[]
  detectedIds: string[]
  proposals: InstrumentMappingProposal[]
}>()

const { t } = useT()
const applying = ref(false)

/** Proposals with mutable state for checkboxes and editable names. */
interface ProposalState {
  proposal: InstrumentMappingProposal
  checked: boolean
  name: string
}

const proposalStates = ref<ProposalState[]>([])

// Initialize proposal states when proposals change
watch(
  () => props.proposals,
  (newProposals) => {
    proposalStates.value = newProposals.map((proposal) => ({
      proposal,
      // Engines without existingId are unchecked by default (manual linking required)
      checked: !(proposal.kind === 'engine' && proposal.existingId === null),
      name: proposal.suggestedName,
    }))
  },
  { immediate: true }
)

/** Proposals that are not engines (batteries and tanks - can be auto-created). */
const nonEngineProposals = computed(() =>
  proposalStates.value.filter((state) => state.proposal.kind !== 'engine')
)

/** Checked proposals ready to apply. */
const checkedProposals = computed(() =>
  proposalStates.value.filter(
    (state) =>
      state.checked && !(state.proposal.kind === 'engine' && state.proposal.existingId === null)
  )
)

function applyProposals() {
  if (checkedProposals.value.length === 0) return
  applying.value = true

  const items = checkedProposals.value.map((state) => ({
    kind: state.proposal.kind,
    instrumentKey: state.proposal.instrumentKey,
    name: state.name,
    existingId: state.proposal.existingId,
    tankType: state.proposal.tankType,
  }))

  router.post(
    `/boats/${props.boatId}/instrument-mapping/apply`,
    { items },
    {
      preserveScroll: true,
      onFinish: () => {
        applying.value = false
        // Reload to get updated proposals
        router.reload({ only: ['mappingProposals'] })
      },
    }
  )
}

// Engine linking (same as before)
function engineLabel(engine: BoatShowEngine): string {
  return (
    [engine.brand, engine.model].filter(Boolean).join(' ') ||
    t('instruments.setup.equipment.engineFallback', { id: engine.id })
  )
}

function linkEngine(engine: BoatShowEngine, value: string | number) {
  router.patch(
    `/boats/${props.boatId}/engines/${engine.id}/instrument-key`,
    { instrumentKey: value === '' ? null : String(value) },
    { preserveScroll: true }
  )
}

function engineOptionsFor(engine: BoatShowEngine) {
  const ids = new Set(props.detectedIds)
  if (engine.instrumentKey) ids.add(engine.instrumentKey)
  return [...ids].map((id) => ({ value: id, label: id }))
}

/** Show the "no proposals" state when there are no proposals and all engines are linked. */
const showNoProposals = computed(
  () =>
    props.proposals.length === 0 && props.engines.every((engine) => Boolean(engine.instrumentKey))
)
</script>

<template>
  <div class="space-y-6" data-testid="instrument-setup-equipment">
    <!-- No proposals state -->
    <div v-if="showNoProposals" class="text-sm text-fg-muted" data-testid="equipment-no-proposals">
      {{ t('instruments.setup.equipment.noProposals') }}
    </div>

    <!-- Non-engine proposals (batteries, tanks) - can be batch applied -->
    <div v-if="nonEngineProposals.length > 0" class="space-y-4">
      <p class="text-sm text-fg-muted">
        {{ t('instruments.setup.equipment.intro') }}
      </p>

      <div class="space-y-3">
        <div
          v-for="state in nonEngineProposals"
          :key="`${state.proposal.kind}-${state.proposal.instrumentKey}`"
          class="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/40 p-3"
          :data-testid="`proposal-${state.proposal.kind}-${state.proposal.instrumentKey}`"
        >
          <BaseCheckbox
            v-model="state.checked"
            :name="`proposal-${state.proposal.kind}-${state.proposal.instrumentKey}`"
            :aria-label="t('instruments.setup.equipment.selectProposal')"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium uppercase text-fg-muted">
                {{ t(`instruments.setup.equipment.kind.${state.proposal.kind}`) }}
              </span>
              <span v-if="state.proposal.deviceLabel" class="text-xs text-fg-subtle">
                {{ state.proposal.deviceLabel }}
              </span>
            </div>
            <BaseInput
              v-if="state.proposal.existingId === null"
              v-model="state.name"
              :name="`name-${state.proposal.kind}-${state.proposal.instrumentKey}`"
              size="sm"
              class="mt-1"
              :aria-label="t('instruments.setup.equipment.nameLabel')"
            />
            <p v-else class="text-sm font-medium text-fg">
              {{ state.name }}
            </p>
            <p class="text-xs text-fg-subtle mt-0.5">
              {{ state.proposal.instrumentKey }}
            </p>
          </div>
        </div>
      </div>

      <BaseButton
        type="button"
        :disabled="checkedProposals.length === 0 || applying"
        data-testid="equipment-apply"
        @click="applyProposals"
      >
        {{ t('instruments.setup.equipment.applyAll') }}
      </BaseButton>
    </div>

    <!-- Engine linking section (manual, select-based) -->
    <div v-if="engines.length > 0" class="space-y-4">
      <p class="text-sm font-medium text-fg">
        {{ t('instruments.setup.equipment.enginesTitle') }}
      </p>
      <p class="text-sm text-fg-muted">
        {{
          detectedIds.length > 0
            ? t('instruments.setup.equipment.enginesIntro')
            : t('instruments.setup.equipment.enginesNoneDetected')
        }}
      </p>
      <BaseSelect
        v-for="engine in engines"
        :key="engine.id"
        :model-value="engine.instrumentKey ?? ''"
        :label="engineLabel(engine)"
        :name="`engineKey${engine.id}`"
        :options="engineOptionsFor(engine)"
        :placeholder="t('instruments.setup.equipment.engineUnlinked')"
        allow-empty
        :data-testid="`instrument-setup-engine-${engine.id}`"
        @update:model-value="linkEngine(engine, $event)"
      />
    </div>

    <!-- Empty state when no engines -->
    <p
      v-if="engines.length === 0 && proposals.length === 0"
      class="text-sm text-fg-muted"
      data-testid="equipment-empty"
    >
      {{ t('instruments.setup.equipment.empty') }}
    </p>
  </div>
</template>
