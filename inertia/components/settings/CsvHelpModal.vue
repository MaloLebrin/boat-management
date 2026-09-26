<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/use_t'
import {
  CSV_IMPORT_MAX_FILE_SIZE_MB,
  CSV_IMPORT_MAX_ROWS,
  EXPENSE_HEADER_ALIASES,
  IMPORT_DATE_FORMATS_HINT,
} from '#shared/constants/csv_import'
import { BUDGET_ENTRY_CATEGORIES } from '#shared/types/budget'
import {
  EXPENSE_CSV_HEADERS,
  EXPENSE_CSV_REQUIRED_HEADERS,
  MAINTENANCE_CSV_HEADERS,
  type CsvImportType,
} from '#shared/types/csv'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** Type d'import courant : le bloc « format attendu » suit la sélection. */
    type?: CsvImportType
  }>(),
  { type: 'maintenance' }
)
defineEmits<{ (e: 'update:open', value: boolean): void }>()

const { t } = useT()

/**
 * Les bornes viennent des constantes partagées (#774) : le texte annonçait
 * 5 Mo sans plafond de lignes, alors que le validateur et le parse en
 * imposent d'autres. Une aide qui ment sur la limite se paie en fichiers
 * refusés sans explication. Les steps 1, 3 et 4 n'interpolent rien — les
 * paramètres en trop sont ignorés.
 */
const limits = {
  size: String(CSV_IMPORT_MAX_FILE_SIZE_MB),
  rows: String(CSV_IMPORT_MAX_ROWS),
}

const MAINTENANCE_REQUIRED = ['date', 'title', 'subject'] as const

/** Colonnes requises/optionnelles rendues depuis les constantes, pas en dur. */
const requiredColumns = computed(() =>
  (props.type === 'expenses' ? EXPENSE_CSV_REQUIRED_HEADERS : MAINTENANCE_REQUIRED).join(', ')
)
const optionalColumns = computed(() => {
  const all: readonly string[] =
    props.type === 'expenses' ? EXPENSE_CSV_HEADERS : MAINTENANCE_CSV_HEADERS
  const required: readonly string[] =
    props.type === 'expenses' ? EXPENSE_CSV_REQUIRED_HEADERS : MAINTENANCE_REQUIRED
  return all.filter((column) => !required.includes(column)).join(', ')
})

/** « label (libelle, intitule, titre…) · amount (montant, prix…) · … » */
const headerAliases = EXPENSE_CSV_HEADERS.map((key) => {
  const aliases = EXPENSE_HEADER_ALIASES[key].filter((alias) => alias !== key)
  return aliases.length > 0 ? `${key} (${aliases.join(', ')})` : key
}).join(' · ')

const categoryValues = BUDGET_ENTRY_CATEGORIES.join(', ')
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('settings.import.help.title')"
    size="lg"
    @update:open="$emit('update:open', $event)"
  >
    <div class="space-y-6 text-sm">
      <div>
        <p class="mb-3 font-semibold text-fg">{{ t('settings.import.help.stepsTitle') }}</p>
        <ol class="space-y-2">
          <li v-for="n in 4" :key="n" class="flex items-start gap-2 text-fg-muted">
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand"
              >{{ n }}</span
            >
            {{ t(`settings.import.help.step${n}`, limits) }}
          </li>
        </ol>
      </div>

      <div v-if="type === 'expenses'" data-testid="help-format-expenses">
        <p class="mb-2 font-semibold text-fg">
          {{ t('settings.import.help.formatTitleExpenses') }}
        </p>
        <p class="mb-2 text-fg-muted">{{ t('settings.import.help.expenses.formatDesc') }}</p>
        <pre class="overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs text-fg">
date;label;amount;category;description
2024-01-15;Antifouling;350.00;maintenance;Carénage annuel
15/02/2024;Plein gasoil;120,50;carburant;</pre
        >
        <p class="mt-2 text-fg-muted">
          <strong class="text-fg">{{ t('settings.import.help.requiredColumns') }}</strong>
          : {{ requiredColumns }}
        </p>
        <p class="text-fg-muted">
          <strong class="text-fg">{{ t('settings.import.help.optionalColumns') }}</strong>
          : {{ optionalColumns }}
        </p>
        <ul class="mt-2 space-y-1 text-fg-muted">
          <li>
            {{ t('settings.import.help.expenses.headerAliases', { headers: headerAliases }) }}
          </li>
          <li>
            {{
              t('settings.import.help.expenses.dateFormats', { formats: IMPORT_DATE_FORMATS_HINT })
            }}
          </li>
          <li>{{ t('settings.import.help.expenses.amountFormats') }}</li>
          <li>{{ t('settings.import.help.expenses.categories', { values: categoryValues }) }}</li>
          <li>{{ t('settings.import.help.expenses.duplicates') }}</li>
        </ul>
      </div>

      <div v-else data-testid="help-format-maintenance">
        <p class="mb-2 font-semibold text-fg">{{ t('settings.import.help.formatTitle') }}</p>
        <p class="mb-2 text-fg-muted">{{ t('settings.import.help.formatDesc') }}</p>
        <pre class="overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs text-fg">
date;title;subject;notes;engine_caption;sail_caption;cost
2024-01-15;Vidange moteur;engine;;Volvo D2-40;;350.00
2024-03-01;Remplacement foc;sail;;;Foc 120%;</pre
        >
        <p class="mt-2 text-fg-muted">
          <strong class="text-fg">{{ t('settings.import.help.requiredColumns') }}</strong>
          : {{ requiredColumns }}
        </p>
        <p class="text-fg-muted">
          <strong class="text-fg">{{ t('settings.import.help.optionalColumns') }}</strong>
          : {{ optionalColumns }}
        </p>
      </div>

      <div>
        <p class="mb-2 font-semibold text-fg">{{ t('settings.import.help.exportTitle') }}</p>
        <p class="text-fg-muted">{{ t('settings.import.help.exportDesc') }}</p>
      </div>
    </div>
  </BaseModal>
</template>
