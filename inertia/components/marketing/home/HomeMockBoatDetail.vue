<script setup lang="ts">
import { useT } from '~/composables/use_t'

const { t } = useT()
</script>

<template>
  <div class="flex h-full w-full overflow-hidden rounded-lg bg-cream" style="font-size: 10px">
    <!-- Sidebar -->
    <div
      class="hidden md:flex w-[140px] shrink-0 flex-col"
      style="background: linear-gradient(180deg, #0b1d2e 0%, #102a40 100%)"
    >
      <div class="flex items-center gap-1.5 px-3 py-3">
        <svg width="16" height="16" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="#faf6ee" stroke-width="3" />
          <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#faf6ee" />
          <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
        </svg>
        <span class="font-display text-[11px] text-white"
          >Fleet<em class="text-coral-500">Ai</em></span
        >
      </div>
      <nav class="mt-2 flex flex-col gap-0.5 px-2">
        <div class="flex items-center gap-1.5 px-2 py-1.5 text-white/50">
          <div class="h-3 w-3 rounded bg-white/20" />
          <span>{{ t('homePreview.mock.nav.dashboard') }}</span>
        </div>
        <div class="flex items-center gap-1.5 rounded bg-white/10 px-2 py-1.5 text-white">
          <div class="h-3 w-3 rounded bg-white/30" />
          <span>{{ t('homePreview.mock.nav.boats') }}</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-1.5 text-white/50">
          <div class="h-3 w-3 rounded bg-white/20" />
          <span>{{ t('homePreview.mock.nav.planning') }}</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-1.5 text-white/50">
          <div class="h-3 w-3 rounded bg-white/20" />
          <span>{{ t('homePreview.mock.nav.history') }}</span>
        </div>
      </nav>
    </div>

    <!-- Main content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header with boat name and tabs -->
      <div class="border-b border-bone bg-surface-elevated px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-lg">
              <span>&#9973;</span>
            </div>
            <div>
              <p class="font-semibold text-fg">Mistral II</p>
              <p class="text-[9px] text-fg-muted">Jeanneau Sun Odyssey 440</p>
            </div>
          </div>
          <span
            class="rounded-full bg-coral-100 px-2 py-0.5 text-[9px] font-medium text-coral-700"
            >{{ t('homePreview.mock.boatDetail.overdueBadge') }}</span
          >
        </div>
        <div class="mt-2 flex gap-1">
          <span class="rounded bg-brand-soft px-2 py-0.5 text-[9px] font-medium text-brand">{{
            t('homePreview.mock.boatDetail.tabOverview')
          }}</span>
          <span class="px-2 py-0.5 text-[9px] text-fg-muted">{{
            t('homePreview.mock.boatDetail.tabHistory')
          }}</span>
          <span class="px-2 py-0.5 text-[9px] text-fg-muted">{{
            t('homePreview.mock.boatDetail.tabDocuments')
          }}</span>
          <span class="px-2 py-0.5 text-[9px] text-fg-muted">{{
            t('homePreview.mock.boatDetail.tabTasks')
          }}</span>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <!-- Content area -->
        <div class="flex-1 overflow-auto p-3">
          <!-- Alert card -->
          <div class="mb-3 flex items-center gap-2 rounded-lg bg-coral-500 px-3 py-2 text-white">
            <svg
              class="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span class="font-medium">{{ t('homePreview.mock.boatDetail.alert') }}</span>
          </div>

          <!-- KPI cards -->
          <div class="mb-3 grid grid-cols-3 gap-2">
            <div class="rounded-lg border border-bone bg-surface-elevated p-2">
              <p class="text-[9px] font-medium uppercase text-fg-muted">
                {{ t('homePreview.mock.boatDetail.kpiEngineHours') }}
              </p>
              <p class="font-display text-lg text-fg">342h</p>
              <p class="text-[9px] text-fg-subtle">
                {{ t('homePreview.mock.boatDetail.kpiEngineHoursHint') }}
              </p>
            </div>
            <div class="rounded-lg border border-bone bg-surface-elevated p-2">
              <p class="text-[9px] font-medium uppercase text-fg-muted">
                {{ t('homePreview.mock.boatDetail.kpiLastMaintenance') }}
              </p>
              <p class="font-display text-lg text-fg">
                {{ t('homePreview.mock.boatDetail.kpiLastMaintenanceValue') }}
              </p>
              <p class="text-[9px] text-fg-subtle">
                {{ t('homePreview.mock.boatDetail.kpiLastMaintenanceHint') }}
              </p>
            </div>
            <div class="rounded-lg border border-coral-200 bg-coral-50 p-2">
              <p class="text-[9px] font-medium uppercase text-coral-700">
                {{ t('homePreview.mock.boatDetail.kpiNext') }}
              </p>
              <p class="font-display text-lg text-coral-600">
                {{ t('homePreview.mock.boatDetail.kpiNextValue') }}
              </p>
              <p class="text-[9px] text-coral-600">
                {{ t('homePreview.mock.boatDetail.kpiNextHint') }}
              </p>
            </div>
          </div>

          <!-- Specs grid -->
          <div class="rounded-lg border border-bone bg-surface-elevated p-3">
            <p class="mb-2 font-semibold text-fg">
              {{ t('homePreview.mock.boatDetail.specsTitle') }}
            </p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p class="text-[9px] text-fg-muted">
                  {{ t('homePreview.mock.boatDetail.specLength') }}
                </p>
                <p class="font-medium">13.39 m</p>
              </div>
              <div>
                <p class="text-[9px] text-fg-muted">
                  {{ t('homePreview.mock.boatDetail.specBeam') }}
                </p>
                <p class="font-medium">4.29 m</p>
              </div>
              <div>
                <p class="text-[9px] text-fg-muted">
                  {{ t('homePreview.mock.boatDetail.specDraft') }}
                </p>
                <p class="font-medium">2.20 m</p>
              </div>
              <div>
                <p class="text-[9px] text-fg-muted">
                  {{ t('homePreview.mock.boatDetail.specEngine') }}
                </p>
                <p class="font-medium">Yanmar 45CV</p>
              </div>
              <div>
                <p class="text-[9px] text-fg-muted">
                  {{ t('homePreview.mock.boatDetail.specYear') }}
                </p>
                <p class="font-medium">2019</p>
              </div>
              <div>
                <p class="text-[9px] text-fg-muted">
                  {{ t('homePreview.mock.boatDetail.specCategory') }}
                </p>
                <p class="font-medium">CE-A</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right panel -->
        <div class="w-[160px] shrink-0 border-l border-bone bg-paper/50 p-3">
          <!-- AI suggestion -->
          <div class="mb-3 rounded-lg bg-violet-600 p-2 text-white">
            <div class="mb-1 flex items-center gap-1">
              <div class="h-3 w-3 rounded bg-white/30" />
              <span class="font-medium">{{ t('homePreview.mock.boatDetail.aiTitle') }}</span>
            </div>
            <p class="text-[9px] text-white/80">
              {{ t('homePreview.mock.boatDetail.aiMessage') }}
            </p>
            <button
              class="mt-1.5 w-full rounded bg-white/20 px-2 py-1 text-[9px] font-medium hover:bg-white/30"
            >
              {{ t('homePreview.mock.boatDetail.aiAction') }}
            </button>
          </div>

          <!-- Location -->
          <div class="rounded-lg border border-bone bg-surface-elevated p-2">
            <p class="mb-1 text-[9px] font-medium uppercase text-fg-muted">
              {{ t('homePreview.mock.boatDetail.locationTitle') }}
            </p>
            <p class="font-medium text-fg">Ponton B-12</p>
            <p class="text-[9px] text-fg-muted">Marina Bleue</p>
            <div class="mt-2 h-16 rounded bg-bone/50" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
