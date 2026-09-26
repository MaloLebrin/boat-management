<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import DashboardBoatCard from '~/components/dashboard/DashboardBoatCard.vue'
import type { DashboardBoatSummary } from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'
import { propulsionLabel } from '~/utils/boat_enum_labels'

const { t } = useT()

defineProps<{ boats: DashboardBoatSummary[] }>()
</script>

<template>
  <BaseCard :padded="false">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.yourBoats.title') }}</h2>
        <Link
          href="/boats"
          data-testid="dashboard-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.yourBoats.viewAll') }}
        </Link>
      </div>
    </template>

    <!-- Motif #493 : cartes sous lg, table à partir de lg. Les classes
         `lg:hidden space-y-3` / `hidden lg:block` sont celles que le test
         navigateur `mobile_field.spec.ts` interroge — ne pas les renommer. -->
    <div class="lg:hidden space-y-3 p-4">
      <DashboardBoatCard v-for="b in boats" :key="b.id" :boat="b" />
      <p v-if="boats.length === 0" class="py-4 text-center text-sm text-fg-muted">
        {{ t('dashboard.yourBoats.empty') }}
      </p>
    </div>

    <div class="hidden lg:block overflow-x-auto px-6 py-5">
      <div class="rounded-(--radius-control) border border-border">
        <!-- Plus de `min-w-[520px]` : la colonne principale (2fr) laisse
             assez de place aux cinq colonnes, l'en-tête « Gréement » n'est
             plus tronqué (#828). -->
        <table class="w-full text-left text-sm">
          <thead class="bg-surface-muted text-fg-muted">
            <tr>
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.yourBoats.columns.name') }}</th>
              <th class="px-4 py-3 font-semibold">
                {{ t('dashboard.yourBoats.columns.propulsion') }}
              </th>
              <th class="px-4 py-3 font-semibold whitespace-nowrap">
                {{ t('dashboard.yourBoats.columns.engines') }}
              </th>
              <th class="px-4 py-3 font-semibold whitespace-nowrap">
                {{ t('dashboard.yourBoats.columns.sails') }}
              </th>
              <th class="px-4 py-3 font-semibold whitespace-nowrap">
                {{ t('dashboard.yourBoats.columns.rig') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in boats" :key="b.id" class="border-t border-border">
              <td class="max-w-[16rem] truncate px-4 py-3">
                <Link :href="`/boats/${b.id}`" class="font-semibold text-fg hover:underline">
                  {{ b.name }}
                </Link>
              </td>
              <td class="px-4 py-3 text-fg-muted">
                {{ propulsionLabel(t, b.propulsionType) ?? '-' }}
              </td>
              <td class="px-4 py-3 text-fg-muted">{{ b.enginesCount }}</td>
              <td class="px-4 py-3 text-fg-muted">{{ b.sailsCount }}</td>
              <td class="px-4 py-3 text-fg-muted">
                {{ b.hasRig ? t('common.yes') : t('common.no') }}
              </td>
            </tr>
            <tr v-if="boats.length === 0">
              <td class="px-4 py-8 text-center text-fg-muted" colspan="5">
                {{ t('dashboard.yourBoats.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </BaseCard>
</template>
