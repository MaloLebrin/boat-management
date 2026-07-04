<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import { useT } from '~/composables/use_t'
import type { PricingSeasonRow, BoatOption } from '../../../shared/types/pricing_season'

const props = defineProps<{
  season?: PricingSeasonRow | null
  boatOptions: BoatOption[]
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const isEdit = computed(() => Boolean(props.season))

type PricingType = 'fixed' | 'multiplier'
const pricingType = ref<PricingType>(props.season?.dailyPrice != null ? 'fixed' : 'multiplier')

const form = useForm({
  boatId: props.season?.boatId ?? null,
  name: props.season?.name ?? '',
  startsOn: props.season?.startsOn ?? '',
  endsOn: props.season?.endsOn ?? '',
  dailyPrice: props.season?.dailyPrice ?? null,
  multiplier: props.season?.multiplier ?? null,
  priority: props.season?.priority ?? 0,
})

const boatSelectOptions = computed(() => [
  { label: t('pricingSeasons.scope.global'), value: '' },
  ...props.boatOptions.map((b) => ({ label: b.name, value: String(b.id) })),
])

const pricingTypeOptions = computed(() => [
  { label: t('pricingSeasons.pricingType.fixedPrice'), value: 'fixed' as const },
  { label: t('pricingSeasons.pricingType.multiplier'), value: 'multiplier' as const },
])

watch(pricingType, (newType) => {
  if (newType === 'fixed') {
    form.multiplier = null
  } else {
    form.dailyPrice = null
  }
})

function submit() {
  const payload = {
    ...form.data(),
    boatId: form.boatId || null,
    dailyPrice: pricingType.value === 'fixed' ? form.dailyPrice : null,
    multiplier: pricingType.value === 'multiplier' ? form.multiplier : null,
  }

  if (isEdit.value) {
    form
      .transform(() => payload)
      .put(`/pricing/seasons/${props.season!.id}`, {
        preserveScroll: true,
        onSuccess: () => emit('close'),
      })
  } else {
    form
      .transform(() => payload)
      .post('/pricing/seasons', {
        preserveScroll: true,
        onSuccess: () => {
          form.reset()
          emit('close')
        },
      })
  }
}
</script>

<template>
  <form
    class="space-y-4 rounded-lg border border-border bg-surface-elevated p-4"
    @submit.prevent="submit"
  >
    <p class="text-sm font-semibold text-fg">
      {{ isEdit ? t('pricingSeasons.form.editTitle') : t('pricingSeasons.form.createTitle') }}
    </p>

    <BaseSelect
      :model-value="form.boatId ? String(form.boatId) : ''"
      :label="t('pricingSeasons.fields.boatId')"
      :options="boatSelectOptions"
      :errors="form.errors"
      error-key="boatId"
      name="boatId"
      @update:model-value="form.boatId = $event ? Number($event) : null"
    />

    <BaseInput
      v-model="form.name"
      :label="t('pricingSeasons.fields.name')"
      :errors="form.errors"
      error-key="name"
      name="name"
      required
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.startsOn"
        :label="t('pricingSeasons.fields.startsOn')"
        :errors="form.errors"
        error-key="startsOn"
        name="startsOn"
        type="date"
        required
      />
      <BaseInput
        v-model="form.endsOn"
        :label="t('pricingSeasons.fields.endsOn')"
        :errors="form.errors"
        error-key="endsOn"
        name="endsOn"
        type="date"
        required
      />
    </div>

    <div class="space-y-3">
      <p class="text-sm font-medium text-fg">{{ t('pricingSeasons.pricingType.label') }}</p>
      <BaseSegmentedControl v-model="pricingType" :options="pricingTypeOptions" />
      <p class="text-xs text-fg-muted">{{ t('pricingSeasons.pricingHint') }}</p>
    </div>

    <div v-if="pricingType === 'fixed'">
      <BaseInput
        :model-value="form.dailyPrice != null ? String(form.dailyPrice) : ''"
        :label="t('pricingSeasons.fields.dailyPrice')"
        :errors="form.errors"
        error-key="dailyPrice"
        name="dailyPrice"
        type="number"
        inputmode="decimal"
        @update:model-value="form.dailyPrice = $event ? Number($event) : null"
      />
    </div>

    <div v-if="pricingType === 'multiplier'">
      <BaseInput
        :model-value="form.multiplier != null ? String(form.multiplier) : ''"
        :label="t('pricingSeasons.fields.multiplier')"
        :errors="form.errors"
        error-key="multiplier"
        name="multiplier"
        type="number"
        inputmode="decimal"
        step="0.01"
        @update:model-value="form.multiplier = $event ? Number($event) : null"
      />
    </div>

    <BaseInput
      :model-value="String(form.priority)"
      :label="t('pricingSeasons.fields.priority')"
      :hint="t('pricingSeasons.fields.priorityHint')"
      :errors="form.errors"
      error-key="priority"
      name="priority"
      type="number"
      inputmode="numeric"
      @update:model-value="form.priority = Number($event) || 0"
    />

    <div class="flex justify-end gap-2">
      <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
        {{ t('pricingSeasons.form.cancel') }}
      </BaseButton>
      <BaseButton type="submit" variant="primary" size="sm" :disabled="form.processing">
        {{ t('pricingSeasons.form.submit') }}
      </BaseButton>
    </div>
  </form>
</template>
