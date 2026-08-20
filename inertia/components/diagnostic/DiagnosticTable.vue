<script setup lang="ts">
import type { DiagnosticTable } from '#shared/types/diagnostic'
import { useT } from '~/composables/use_t'

const { t } = useT()

defineProps<{
  table: DiagnosticTable
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-surface-muted/50 text-left">
          <th
            v-for="headerKey in table.headerKeys"
            :key="headerKey"
            class="px-3 py-2 font-semibold text-fg"
          >
            {{ t(headerKey) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, rowIndex) in table.rowKeys"
          :key="rowIndex"
          class="border-b border-border last:border-b-0"
        >
          <td v-for="cellKey in row" :key="cellKey" class="px-3 py-2 align-top text-fg-muted">
            {{ t(cellKey) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
