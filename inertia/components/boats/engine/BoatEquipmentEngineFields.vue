<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BoatEngineIdentityFields from '~/components/boats/engine/BoatEngineIdentityFields.vue'
import { useT } from '~/composables/use_t'
import { useBoatOptions } from '~/composables/use_boat_options'
import { useEngineCatalog } from '~/composables/use_engine_catalog'
import { useEngineFormDraft } from '~/composables/use_engine_form_draft'
import { ENGINE_KIND_OPTIONS } from '#shared/constants/boats/boat_form_options'
import { engineFamilyFromCatalogModel } from '#shared/helpers/engine_family'
import type { EngineModelOption } from '#shared/types/engine_catalog'

export type BoatEquipmentEngineFieldsModel = {
  id?: number
  kind: string
  fuel: string | null
  strokeType: '2_stroke' | '4_stroke' | null
  /** Famille de motorisation (#574) — facultative. */
  family: string | null
  brand: string | null
  model: string | null
  engineModelId?: number | null
  serialNumber: string | null
  manufacturedAt: string | null
  powerHp: number | null
  hours: number | null
  installHours: number | null
  status: 'operational' | 'in_maintenance' | 'out_of_service' | 'retired'
}

const props = defineProps<{
  errors: Record<string, string | string[] | undefined>
  engine?: BoatEquipmentEngineFieldsModel | null
  /** Surface d'origine quand le formulaire est monté dans une modale. */
  surface?: string | null
}>()

const isEditMode = computed(() => Boolean(props.engine))

const { t } = useT()
const { engineKindOptions, engineFamilyOptions, engineFuelOptions, engineStrokeTypeOptions } =
  useBoatOptions()
// Catalogue moteur (#573) : lu dans les props de la page, pas passé de main en
// main — ce formulaire est monté depuis trois écrans, à quatre niveaux de
// profondeur sous la fiche bateau.
const { brands, catalogModels, catalogBrandId } = useEngineCatalog()

const statusOptions = computed(() => [
  { value: 'operational', label: t('equipment.status.operational') },
  { value: 'in_maintenance', label: t('equipment.status.in_maintenance') },
  { value: 'out_of_service', label: t('equipment.status.out_of_service') },
  { value: 'retired', label: t('equipment.status.retired') },
])

const kind = ref('')
const family = ref('')
const fuel = ref('')
const strokeType = ref('')
const installHours = ref('')
const brand = ref('')
const model = ref('')
const serialNumber = ref('')
const manufacturedAt = ref('')
const powerHp = ref('')
const status = ref('')

function syncFromProps() {
  const e = props.engine
  kind.value = e?.kind ?? ENGINE_KIND_OPTIONS[0]?.value ?? ''
  family.value = e?.family ?? ''
  fuel.value = e?.fuel ?? ''
  strokeType.value = e?.strokeType ?? ''
  installHours.value =
    e?.installHours === null || e?.installHours === undefined ? '' : String(e.installHours)
  brand.value = e?.brand ?? ''
  model.value = e?.model ?? ''
  serialNumber.value = e?.serialNumber ?? ''
  manufacturedAt.value = e?.manufacturedAt ? e.manufacturedAt.slice(0, 10) : ''
  powerHp.value = e?.powerHp === null || e?.powerHp === undefined ? '' : String(e.powerHp)
  status.value = e?.status ?? 'operational'
}

useEngineFormDraft(
  String(props.engine?.id ?? 'new'),
  {
    kind,
    family,
    fuel,
    strokeType,
    installHours,
    brand,
    model,
    serialNumber,
    manufacturedAt,
    powerHp,
    status,
  },
  syncFromProps
)

// On resynchronise sur l'**identité** du moteur, pas sur la référence de la
// prop : cette dernière change à chaque visite partielle.
watch(() => props.engine?.id, syncFromProps)

/**
 * Pré-remplissage **non destructif** au choix d'un modèle du catalogue : on ne
 * renseigne que les champs restés vides. Une valeur déjà saisie par
 * l'utilisateur — y compris héritée du moteur en cours d'édition — n'est jamais
 * écrasée : c'est lui qui connaît son moteur, le catalogue ne fait que
 * proposer.
 */
function applyCatalogModel(catalogModel: EngineModelOption) {
  if (powerHp.value === '' && catalogModel.powerHp !== null) {
    powerHp.value = String(catalogModel.powerHp)
  }
  if (fuel.value === '' && catalogModel.fuel !== null) fuel.value = catalogModel.fuel
  if (strokeType.value === '' && catalogModel.strokeType !== null) {
    strokeType.value = catalogModel.strokeType
  }
  // Le catalogue classe des gammes, pas des installations : il ne connaît pas
  // la transmission. La famille proposée est donc la variante la plus courante
  // (ligne d'arbre pour un diesel), que l'utilisateur reste libre de corriger.
  if (family.value === '') {
    family.value = engineFamilyFromCatalogModel(catalogModel) ?? ''
  }
}
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <BaseSelect
      id="kind"
      name="kind"
      :label="t('boats.engines.fields.kind')"
      :options="engineKindOptions"
      v-model="kind"
      :errors="errors"
    />

    <BaseSelect
      id="fuel"
      name="fuel"
      :label="t('boats.engines.fields.fuel')"
      placeholder="—"
      :allow-empty="true"
      :options="engineFuelOptions"
      v-model="fuel"
      :errors="errors"
    />

    <BaseSelect
      id="family"
      name="family"
      class="col-span-2"
      :label="t('boats.engines.fields.family')"
      :hint="t('boats.engines.fields.familyHint')"
      placeholder="—"
      :allow-empty="true"
      :options="engineFamilyOptions"
      v-model="family"
      :errors="errors"
    />

    <BaseSelect
      id="strokeType"
      name="strokeType"
      :label="t('boats.engines.fields.strokeType')"
      placeholder="—"
      :allow-empty="true"
      :options="engineStrokeTypeOptions"
      v-model="strokeType"
      :errors="errors"
    />

    <BoatEngineIdentityFields
      v-model:brand="brand"
      v-model:model="model"
      :errors="errors"
      :brands="brands"
      :catalog-models="catalogModels"
      :catalog-brand-id="catalogBrandId"
      :engine-model-id="engine?.engineModelId ?? null"
      :surface="surface"
      @select-model="applyCatalogModel"
    />
    <BaseInput
      id="serialNumber"
      name="serialNumber"
      :label="t('boats.engines.fields.serialNumber')"
      v-model="serialNumber"
      :errors="errors"
    />
    <BaseInput
      id="manufacturedAt"
      name="manufacturedAt"
      :label="t('boats.engines.fields.manufacturedAt')"
      type="date"
      v-model="manufacturedAt"
      :errors="errors"
    />
    <BaseInput
      id="powerHp"
      name="powerHp"
      :label="t('boats.engines.fields.powerHp')"
      type="number"
      step="0.1"
      inputmode="decimal"
      v-model="powerHp"
      :errors="errors"
    />
    <BaseInput
      v-if="!isEditMode"
      id="installHours"
      name="installHours"
      :label="t('boats.engines.fields.installHours')"
      type="number"
      inputmode="numeric"
      v-model="installHours"
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

    <div
      v-if="isEditMode"
      class="col-span-2 flex flex-wrap gap-x-6 gap-y-1 rounded-(--radius-control) bg-surface-muted/40 p-3 text-sm text-fg-muted"
    >
      <span>{{ t('boats.engines.fields.hours') }} : {{ engine?.hours ?? '—' }} h</span>
      <span
        >{{ t('boats.engines.fields.installHours') }} : {{ engine?.installHours ?? '—' }} h</span
      >
    </div>
  </div>
</template>
