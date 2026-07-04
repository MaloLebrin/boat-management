<script setup lang="ts">
import { computed, ref } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import PricingSeasonForm from '~/components/pricing/PricingSeasonForm.vue'
import PricingSeasonList from '~/components/pricing/PricingSeasonList.vue'
import { useT } from '~/composables/use_t'
import type {
  PricingSeasonRow,
  BoatOption,
  PricingSeasonListFilters,
} from '../../../../shared/types/pricing_season'

const props = defineProps<{
  seasons: PricingSeasonRow[]
  boatOptions: BoatOption[]
  filters: PricingSeasonListFilters
  canDelete: boolean
}>()

const { t } = useT()
const page = usePage()

const flash = computed(() => page.props.flash as { error?: string; success?: string } | undefined)

const showCreateForm = ref(false)
const editingSeason = ref<PricingSeasonRow | null>(null)
const deletingSeason = ref<PricingSeasonRow | null>(null)

const boatFilterOptions = computed(() => [
  { label: t('pricingSeasons.filter.allBoats'), value: '' },
  ...props.boatOptions.map((b) => ({ label: b.name, value: String(b.id) })),
])

function onBoatFilterChange(value: string | number) {
  const boatId = value === '' ? undefined : value
  router.get(
    '/pricing/seasons',
    { boatId },
    { preserveScroll: true, preserveState: true, replace: true }
  )
}

function handleEdit(season: PricingSeasonRow) {
  editingSeason.value = season
}

function handleDelete(season: PricingSeasonRow) {
  deletingSeason.value = season
}

function executeDelete() {
  if (!deletingSeason.value) return
  router.delete(`/pricing/seasons/${deletingSeason.value.id}`, {
    preserveScroll: true,
    onFinish: () => {
      deletingSeason.value = null
    },
  })
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <BaseHeading level="1">{{ t('pricingSeasons.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">
          {{ t('pricingSeasons.count', { count: String(seasons.length) }) }}
        </p>
      </div>
      <BaseButton variant="primary" size="sm" type="button" @click="showCreateForm = true">
        {{ t('pricingSeasons.add') }}
      </BaseButton>
    </div>

    <BaseAlert v-if="flash?.success" variant="success" class="mb-6" dismissible>
      {{ flash.success }}
    </BaseAlert>
    <BaseAlert v-if="flash?.error" variant="danger" class="mb-6" dismissible>
      {{ flash.error }}
    </BaseAlert>

    <PricingSeasonForm
      v-if="showCreateForm"
      class="mb-6"
      :boat-options="boatOptions"
      @close="showCreateForm = false"
    />

    <PricingSeasonForm
      v-if="editingSeason"
      class="mb-6"
      :season="editingSeason"
      :boat-options="boatOptions"
      @close="editingSeason = null"
    />

    <div class="mt-6 grid gap-3 md:grid-cols-12 md:items-end">
      <div class="md:col-span-4">
        <BaseSelect
          :label="t('pricingSeasons.filter.boat')"
          :model-value="filters.boatId ? String(filters.boatId) : ''"
          :options="boatFilterOptions"
          allow-empty
          :placeholder="t('pricingSeasons.filter.allBoats')"
          @update:model-value="onBoatFilterChange"
        />
      </div>
    </div>

    <div v-if="seasons.length > 0 && !showCreateForm && !editingSeason" class="mt-6">
      <PricingSeasonList
        :seasons="seasons"
        :can-delete="canDelete"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <div v-else-if="seasons.length === 0 && !showCreateForm && !editingSeason" class="mt-8">
      <BaseEmptyState
        :title="t('pricingSeasons.empty.title')"
        :description="t('pricingSeasons.empty.description')"
        :action-label="t('pricingSeasons.add')"
        @action="showCreateForm = true"
      />
    </div>

    <BaseConfirmModal
      :open="deletingSeason !== null"
      :title="t('pricingSeasons.deleteConfirm.title')"
      :message="t('pricingSeasons.deleteConfirm.message')"
      :confirm-label="t('pricingSeasons.delete')"
      :cancel-label="t('pricingSeasons.form.cancel')"
      @update:open="deletingSeason = null"
      @confirm="executeDelete"
    />
  </div>
</template>
