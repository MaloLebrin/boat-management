<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import BaseField from '~/components/base/BaseField.vue'
import { useT } from '~/composables/use_t'
import { getFieldError, nameToErrorKey, type FormErrors } from '~/utils/form_errors'
import { inputClass } from '~/utils/form_styles'

/**
 * Champ texte à suggestions (#571).
 *
 * **La saisie libre est toujours conservée** : la liste ne fait que proposer,
 * sélectionner une option se contente de remplir le champ. Une valeur hors
 * catalogue reste donc valide et part telle quelle au serveur — c'est
 * l'invariant du catalogue de bateaux.
 */
export interface ComboboxOption {
  value: string
  label: string
  /** Ligne secondaire (pays, catégorie…), affichée en gris sous le libellé. */
  hint?: string
}

const props = withDefaults(
  defineProps<{
    id: string
    name?: string
    label?: string
    hint?: string
    placeholder?: string
    /** Message affiché quand aucune option ne correspond à la saisie. */
    emptyLabel?: string
    options: ReadonlyArray<ComboboxOption>
    modelValue?: string
    disabled?: boolean
    error?: string
    errors?: FormErrors
    errorKey?: string
    /** Nombre maximum de suggestions affichées. */
    maxVisible?: number
  }>(),
  {
    modelValue: '',
    disabled: false,
    maxVisible: 50,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  /** Émis uniquement quand l'utilisateur retient une option du catalogue. */
  (e: 'select', option: ComboboxOption): void
}>()

const { t } = useT()

const open = ref(false)
const activeIndex = ref(-1)
const listboxId = computed(() => `${props.id}-listbox`)

const resolvedError = computed(() => {
  if (props.error) return props.error
  return getFieldError(props.errors, props.errorKey ?? nameToErrorKey(props.name ?? ''))
})

/**
 * Filtrage insensible à la casse et aux accents, sur le libellé comme sur la
 * valeur : taper « bene » doit remonter « Bénéteau ».
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const filtered = computed(() => {
  const needle = fold(props.modelValue.trim())
  const source = needle
    ? props.options.filter((o) => fold(o.label).includes(needle) || fold(o.value).includes(needle))
    : props.options
  return source.slice(0, props.maxVisible)
})

const activeOptionId = computed(() =>
  activeIndex.value >= 0 && activeIndex.value < filtered.value.length
    ? `${props.id}-option-${activeIndex.value}`
    : undefined
)

watch(
  () => props.modelValue,
  () => {
    activeIndex.value = -1
  }
)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
  open.value = true
}

function choose(option: ComboboxOption) {
  emit('update:modelValue', option.label)
  emit('select', option)
  open.value = false
  activeIndex.value = -1
}

function move(delta: number) {
  if (!open.value) {
    open.value = true
    return
  }
  const count = filtered.value.length
  if (count === 0) return
  // Depuis « aucune option surlignée », ↓ va sur la première et ↑ sur la
  // dernière — un modulo naïf enverrait ↑ sur l'avant-dernière.
  if (activeIndex.value < 0) {
    activeIndex.value = delta > 0 ? 0 : count - 1
    return
  }
  activeIndex.value = (activeIndex.value + delta + count) % count
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Enter':
      // Sans option surlignée on laisse le formulaire suivre son cours : la
      // saisie libre est une réponse valide.
      if (open.value && activeIndex.value >= 0) {
        event.preventDefault()
        choose(filtered.value[activeIndex.value])
      }
      break
    case 'Escape':
      if (open.value) {
        event.preventDefault()
        open.value = false
        activeIndex.value = -1
      }
      break
    case 'Tab':
      open.value = false
      break
  }
}

function onBlur() {
  // Laisse le clic sur une option se produire avant de fermer la liste.
  nextTick(() => {
    window.setTimeout(() => {
      open.value = false
      activeIndex.value = -1
    }, 120)
  })
}
</script>

<template>
  <BaseField :label="label" :hint="hint" :error="resolvedError" :html-for="id">
    <div class="relative">
      <input
        :id="id"
        :name="name"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-controls="listboxId"
        :aria-activedescendant="activeOptionId"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :data-invalid="resolvedError ? 'true' : undefined"
        :aria-invalid="resolvedError ? 'true' : undefined"
        :class="[inputClass, 'pr-9']"
        @input="onInput"
        @keydown="onKeydown"
        @focus="open = true"
        @blur="onBlur"
      />
      <svg
        class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.936a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
          clip-rule="evenodd"
        />
      </svg>

      <ul
        v-show="open"
        :id="listboxId"
        role="listbox"
        class="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-[var(--radius-control)] border border-border bg-surface-elevated py-1 shadow-lg"
      >
        <li
          v-for="(option, index) in filtered"
          :id="`${id}-option-${index}`"
          :key="option.value"
          role="option"
          :aria-selected="index === activeIndex"
          class="cursor-pointer px-3 py-2 text-sm text-fg"
          :class="index === activeIndex ? 'bg-surface-muted' : 'hover:bg-surface-muted'"
          @mousedown.prevent="choose(option)"
          @mousemove="activeIndex = index"
        >
          <span class="block font-medium">{{ option.label }}</span>
          <span v-if="option.hint" class="block text-xs text-fg-subtle">{{ option.hint }}</span>
        </li>
        <li
          v-if="filtered.length === 0"
          class="px-3 py-2 text-sm text-fg-subtle"
          role="presentation"
        >
          {{ emptyLabel ?? t('common.noResults') }}
        </li>
      </ul>
    </div>
  </BaseField>
</template>
