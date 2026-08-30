<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseCombobox, { type ComboboxOption } from '~/components/base/BaseCombobox.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import { useBoatOptions } from '~/composables/use_boat_options'
import { useSailLofts } from '~/composables/use_sail_lofts'
import { SAIL_TYPE_OPTIONS } from '#shared/constants/boats/boat_form_options'

export type BoatEquipmentSailFieldsModel = {
  id?: number
  sailType: string
  manufacturedAt: string | null
  areaM2: number | null
  material: string | null
  reefPoints: number | null
  status: 'operational' | 'in_maintenance' | 'out_of_service' | 'retired'
  notes: string | null
  purchasePrice: number | null
  purchasedAt: string | null
  sailmaker?: string | null
  sailLoftId?: number | null
}

const props = defineProps<{
  errors: Record<string, string | string[] | undefined>
  sail?: BoatEquipmentSailFieldsModel | null
}>()

const { t } = useT()
const { sailTypeOptions, sailMaterialOptions } = useBoatOptions()
const { lofts, catalogLoftId } = useSailLofts()

const statusOptions = computed(() => [
  { value: 'operational', label: t('equipment.status.operational') },
  { value: 'in_maintenance', label: t('equipment.status.in_maintenance') },
  { value: 'out_of_service', label: t('equipment.status.out_of_service') },
  { value: 'retired', label: t('equipment.status.retired') },
])

const sailType = ref('')
const manufacturedAt = ref('')
const areaM2 = ref('')
const material = ref('')
const reefPoints = ref('')
const status = ref('')
const notes = ref('')
const purchasePrice = ref('')
const purchasedAt = ref('')
const sailmaker = ref('')
/** Rattachement au référentiel envoyé au serveur — vidé dès que la saisie diverge. */
const selectedLoftId = ref<number | null>(null)

/**
 * Voileries du référentiel (#578). **Toute saisie hors référentiel reste
 * acceptée** et part telle quelle au serveur : `sailmaker` demeure la source de
 * vérité, `sailLoftId` n'est qu'un rattachement facultatif. Les alias rendent
 * la recherche aussi tolérante que `resolveLoft` côté serveur.
 */
const loftOptions = computed<ComboboxOption[]>(() =>
  lofts.value.map((loft) => ({
    value: String(loft.id),
    label: loft.name,
    hint: loft.country ?? undefined,
    keywords: loft.aliases,
  }))
)

function onLoftSelected(option: ComboboxOption) {
  selectedLoftId.value = Number(option.value)
}

// Une voilerie retapée à la main (ou effacée) invalide le rattachement : on ne
// veut pas conserver une clé étrangère qui ne correspond plus à la saisie.
watch(sailmaker, (value) => {
  const stillMatches =
    selectedLoftId.value !== null &&
    lofts.value.find((loft) => loft.id === selectedLoftId.value)?.name === value
  if (!stillMatches) selectedLoftId.value = null
})

// Le serveur rapproche la voilerie au rendu (`SailLoftService.formProps`) : une
// voile déjà en base doit retrouver sa voilerie sans que l'utilisateur retape
// quoi que ce soit.
watch(
  () => catalogLoftId.value,
  (value) => {
    if (value != null && selectedLoftId.value === null) selectedLoftId.value = value
  }
)

function syncFromProps() {
  const s = props.sail
  sailType.value = s?.sailType ?? SAIL_TYPE_OPTIONS[0]?.value ?? 'main'
  manufacturedAt.value = s?.manufacturedAt ? s.manufacturedAt.slice(0, 10) : ''
  areaM2.value = s?.areaM2 === null || s?.areaM2 === undefined ? '' : String(s.areaM2)
  material.value = s?.material ?? ''
  reefPoints.value =
    s?.reefPoints === null || s?.reefPoints === undefined ? '' : String(s.reefPoints)
  status.value = s?.status ?? 'operational'
  notes.value = s?.notes ?? ''
  purchasePrice.value =
    s?.purchasePrice === null || s?.purchasePrice === undefined ? '' : String(s.purchasePrice)
  purchasedAt.value = s?.purchasedAt ? s.purchasedAt.slice(0, 10) : ''
  sailmaker.value = s?.sailmaker ?? ''
  selectedLoftId.value = s?.sailLoftId ?? catalogLoftId.value
}

watch(
  () => props.sail,
  () => syncFromProps(),
  { immediate: true }
)
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <BaseSelect
      id="sailType"
      name="sailType"
      :label="t('boats.hullFields.type')"
      :options="sailTypeOptions"
      v-model="sailType"
      :errors="errors"
    />

    <BaseInput
      id="manufacturedAt"
      name="manufacturedAt"
      :label="t('boats.hullFields.manufacturedAt')"
      type="date"
      v-model="manufacturedAt"
      :errors="errors"
    />

    <div class="col-span-2">
      <BaseCombobox
        id="sailmaker"
        name="sailmaker"
        :label="t('boats.sailFields.sailmaker')"
        :placeholder="t('boats.sailFields.sailmakerPlaceholder')"
        :hint="t('boats.sailFields.sailmakerHint')"
        :empty-label="t('boats.sailFields.noSailmakerMatch')"
        :options="loftOptions"
        v-model="sailmaker"
        :errors="errors"
        @select="onLoftSelected"
      />
      <!-- Rattachement facultatif au référentiel : `sailmaker` reste la source
           de vérité, ce champ n'est qu'une clé étrangère de confort. -->
      <input type="hidden" name="sailLoftId" :value="selectedLoftId ?? ''" />
    </div>

    <BaseInput
      id="areaM2"
      name="areaM2"
      :label="t('boats.sailFields.areaM2')"
      type="number"
      step="0.1"
      inputmode="decimal"
      v-model="areaM2"
      :errors="errors"
    />

    <BaseSelect
      id="material"
      name="material"
      :label="t('boats.sailFields.material')"
      :options="sailMaterialOptions"
      :allow-empty="true"
      v-model="material"
      :errors="errors"
    />

    <BaseInput
      id="reefPoints"
      name="reefPoints"
      :label="t('boats.sails.reef')"
      type="number"
      inputmode="numeric"
      v-model="reefPoints"
      :errors="errors"
    />

    <BaseSelect
      id="status"
      name="status"
      :label="t('equipment.status.label')"
      :options="statusOptions"
      v-model="status"
      :errors="errors"
    />

    <div class="col-span-2">
      <BaseTextarea
        id="notes"
        name="notes"
        :label="t('boats.equipment.notes.label')"
        :placeholder="t('boats.equipment.notes.placeholder')"
        :rows="4"
        v-model="notes"
        :errors="errors"
      />
    </div>

    <BaseInput
      id="purchasePrice"
      name="purchasePrice"
      :label="t('equipment.purchasePrice.label')"
      type="number"
      step="0.01"
      min="0"
      v-model="purchasePrice"
      :errors="errors"
    />

    <BaseInput
      id="purchasedAt"
      name="purchasedAt"
      :label="t('equipment.purchasedAt.label')"
      type="date"
      v-model="purchasedAt"
      :errors="errors"
    />
  </div>
</template>
