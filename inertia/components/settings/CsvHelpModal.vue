<script setup lang="ts">
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/use_t'
import { CSV_IMPORT_MAX_FILE_SIZE_MB, CSV_IMPORT_MAX_ROWS } from '#shared/constants/csv_import'

defineProps<{ open: boolean }>()
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

      <div>
        <p class="mb-2 font-semibold text-fg">{{ t('settings.import.help.formatTitle') }}</p>
        <p class="mb-2 text-fg-muted">{{ t('settings.import.help.formatDesc') }}</p>
        <pre class="overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs text-fg">
date;title;subject;notes;engine_caption;sail_caption;cost
2024-01-15;Vidange moteur;engine;;Volvo D2-40;;350.00
2024-03-01;Remplacement foc;sail;;;Foc 120%;</pre
        >
        <p class="mt-2 text-fg-muted">
          <strong class="text-fg">{{ t('settings.import.help.requiredColumns') }}</strong>
          : date, title, subject
        </p>
        <p class="text-fg-muted">
          <strong class="text-fg">{{ t('settings.import.help.optionalColumns') }}</strong>
          : notes, engine_caption, sail_caption, cost
        </p>
      </div>

      <div>
        <p class="mb-2 font-semibold text-fg">{{ t('settings.import.help.exportTitle') }}</p>
        <p class="text-fg-muted">{{ t('settings.import.help.exportDesc') }}</p>
      </div>
    </div>
  </BaseModal>
</template>
