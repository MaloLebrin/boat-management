<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/solid'

defineProps<{
  icon: string
  name: string
  desc: string
  /** Prix mensuel affiché (déjà résolu pour l'intervalle courant). */
  price: number
  pricePer: string
  /** Affiché quand le prix résolu correspond à un tarif facturé annuellement. */
  billedAnnuallyNote?: string
  features: string[]
  selected: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="selected"
    :class="[
      'group flex w-full flex-col rounded-2xl border p-5 text-left transition-all duration-200',
      selected
        ? 'border-coral-500 bg-coral-50 shadow-sm'
        : 'border-bone bg-white hover:border-sand hover:-translate-y-0.5',
    ]"
    @click="emit('toggle')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="text-2xl">{{ icon }}</span>
        <div>
          <h4 class="font-semibold text-fg">{{ name }}</h4>
          <p class="mt-0.5 text-sm text-fg-muted">{{ desc }}</p>
        </div>
      </div>
      <!-- Faux switch -->
      <span
        :class="[
          'mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
          selected ? 'bg-coral-500' : 'bg-sand',
        ]"
      >
        <span
          :class="[
            'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
            selected ? 'translate-x-5' : 'translate-x-0',
          ]"
        />
      </span>
    </div>

    <ul class="mt-4 space-y-1.5">
      <li v-for="feat in features" :key="feat" class="flex items-start gap-2 text-sm text-fg">
        <CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
        <span>{{ feat }}</span>
      </li>
    </ul>

    <div class="mt-4 border-t border-dashed border-current/10 pt-3">
      <div class="flex items-baseline gap-1">
        <span class="font-display text-xl text-fg">+{{ price }} €</span>
        <span class="text-sm text-fg-subtle">{{ pricePer }}</span>
      </div>
      <p v-if="billedAnnuallyNote" class="mt-0.5 text-xs text-fg-subtle">
        {{ billedAnnuallyNote }}
      </p>
    </div>
  </button>
</template>
