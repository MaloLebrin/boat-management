<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useT } from '~/composables/use_t'
import { parseDecimalInput } from '../../../../shared/helpers/number_format'

interface Props {
  lengthM?: number
  yearBuilt?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:lengthM': [value: number | undefined]
  'update:yearBuilt': [value: number | undefined]
}>()

const { t } = useT()

const LENGTH_MIN = 2
const LENGTH_MAX = 30
const YEAR_MIN = 1950
const currentYear = new Date().getFullYear()

// Les champs gardent leur saisie *texte* (#464). Réinjecter un `Number()` dans
// le champ écrasait ce que l'utilisateur tapait : « 10. » est une valeur
// incomplète, donc lue comme vide par le navigateur, donc renvoyée en `0` dans
// le champ — le « 5 » suivant produisait « 05 ». Résultat : « 10.5 » devenait
// « 5 » sans le moindre message.
const lengthText = ref(toInputText(props.lengthM))
const yearText = ref(toInputText(props.yearBuilt))

function toInputText(value: number | undefined | null): string {
  return value != null ? String(value) : ''
}

// Resynchroniser seulement quand le parent porte autre chose que la saisie en
// cours (redémarrage du simulateur), jamais pendant la frappe.
watch(
  () => props.lengthM,
  (value) => {
    if (parseDecimalInput(lengthText.value) !== (value ?? null)) {
      lengthText.value = toInputText(value)
    }
  }
)

watch(
  () => props.yearBuilt,
  (value) => {
    if (parseDecimalInput(yearText.value) !== (value ?? null)) {
      yearText.value = toInputText(value)
    }
  }
)

function onLengthInput(event: Event) {
  lengthText.value = (event.target as HTMLInputElement).value
  emit('update:lengthM', parseDecimalInput(lengthText.value) ?? undefined)
}

function onYearInput(event: Event) {
  yearText.value = (event.target as HTMLInputElement).value
  emit('update:yearBuilt', parseDecimalInput(yearText.value) ?? undefined)
}

// Erreurs affichées seulement sur un champ rempli : on ne gronde pas quelqu'un
// qui n'a pas fini de taper, mais une valeur hors bornes ne peut plus bloquer
// le bouton « Suivant » en silence.
const lengthError = computed(() => {
  const raw = lengthText.value.trim()
  if (raw === '') return null
  const value = parseDecimalInput(raw)
  if (value === null || value < LENGTH_MIN || value > LENGTH_MAX) {
    return t('simulator.length_error', { min: String(LENGTH_MIN), max: String(LENGTH_MAX) })
  }
  return null
})

const yearError = computed(() => {
  const raw = yearText.value.trim()
  if (raw === '') return null
  const value = parseDecimalInput(raw)
  if (value === null || value < YEAR_MIN || value > currentYear) {
    return t('simulator.year_built_error', { min: String(YEAR_MIN), max: String(currentYear) })
  }
  return null
})

const fieldClass = (hasError: boolean) => [
  'w-full rounded-lg border bg-surface-elevated px-4 py-3 text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2',
  hasError
    ? 'border-danger focus:border-danger focus:ring-danger/20'
    : 'border-sand focus:border-navy-500 focus:ring-navy-500/15',
]
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="lengthM" class="mb-2 block text-sm font-semibold text-fg">
        {{ t('simulator.length_label') }}
      </label>
      <input
        id="lengthM"
        type="number"
        inputmode="decimal"
        :min="LENGTH_MIN"
        :max="LENGTH_MAX"
        step="0.1"
        :value="lengthText"
        :placeholder="t('simulator.length_placeholder')"
        :aria-invalid="lengthError ? 'true' : undefined"
        :aria-describedby="lengthError ? 'lengthM-error' : undefined"
        :class="fieldClass(Boolean(lengthError))"
        @input="onLengthInput"
      />
      <p v-if="lengthError" id="lengthM-error" class="mt-1.5 text-xs text-danger">
        {{ lengthError }}
      </p>
    </div>

    <div>
      <label for="yearBuilt" class="mb-2 block text-sm font-semibold text-fg">
        {{ t('simulator.year_built_label') }}
      </label>
      <input
        id="yearBuilt"
        type="number"
        inputmode="numeric"
        :min="YEAR_MIN"
        :max="currentYear"
        :value="yearText"
        :placeholder="String(currentYear - 10)"
        :aria-invalid="yearError ? 'true' : undefined"
        :aria-describedby="yearError ? 'yearBuilt-error' : undefined"
        :class="fieldClass(Boolean(yearError))"
        @input="onYearInput"
      />
      <p v-if="yearError" id="yearBuilt-error" class="mt-1.5 text-xs text-danger">
        {{ yearError }}
      </p>
    </div>
  </div>
</template>
