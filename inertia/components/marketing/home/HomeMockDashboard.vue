<script setup lang="ts">
import { useCountUp } from '~/composables/use_count_up'
import HomeMockUpcomingTasks from './HomeMockUpcomingTasks.vue'

defineProps<{
  persona?: 'loueurs' | 'ecoles' | 'marinas'
}>()

// KPI qui montent quand le mock entre dans le viewport (mock « vivant »).
const fleetCount = useCountUp(22, { duration: 1400 })
const lateCount = useCountUp(3, { duration: 1400 })
const soonCount = useCountUp(7, { duration: 1400 })
const hoursCount = useCountUp(186, { duration: 1600 })
</script>

<template>
  <div class="flex h-full w-full overflow-hidden rounded-lg bg-cream" style="font-size: 10px">
    <!-- Sidebar -->
    <div
      class="hidden lg:flex w-[140px] shrink-0 flex-col"
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
        <div class="flex items-center gap-1.5 rounded bg-white/10 px-2 py-1.5 text-white">
          <div class="h-3 w-3 rounded bg-white/30" />
          <span>Dashboard</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-1.5 text-white/50">
          <div class="h-3 w-3 rounded bg-white/20" />
          <span>Bateaux</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-1.5 text-white/50">
          <div class="h-3 w-3 rounded bg-white/20" />
          <span>Planning</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-1.5 text-white/50">
          <div class="h-3 w-3 rounded bg-white/20" />
          <span>Historique</span>
        </div>
      </nav>
      <div class="mt-auto border-t border-white/10 px-2 py-2">
        <div class="flex items-center gap-1.5 px-2 py-1 text-violet-100/70">
          <div class="h-3 w-3 rounded bg-violet-400/40" />
          <span>FleetAI</span>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-bone bg-white px-4 py-2">
        <div>
          <p class="font-semibold text-fg">Marina Bleue</p>
          <p class="text-[9px] text-fg-muted">22 bateaux</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-5 w-5 rounded-full bg-bone" />
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
            <span class="font-medium">3 maintenances en retard</span>
          </div>

          <!-- KPI cards -->
          <div class="mb-3 grid grid-cols-4 gap-2">
            <div class="rounded-lg border border-bone bg-white p-2">
              <p class="text-[9px] font-medium uppercase text-fg-muted">Flotte</p>
              <p :ref="fleetCount.el" class="font-display text-lg text-fg">
                {{ fleetCount.display.value }}
              </p>
            </div>
            <div class="rounded-lg border border-coral-200 bg-coral-50 p-2">
              <p class="text-[9px] font-medium uppercase text-coral-700">En retard</p>
              <p :ref="lateCount.el" class="font-display text-lg text-coral-600">
                {{ lateCount.display.value }}
              </p>
            </div>
            <div class="rounded-lg border border-amber-200 bg-amber-50 p-2">
              <p class="text-[9px] font-medium uppercase text-amber-700">Sous 14j</p>
              <p :ref="soonCount.el" class="font-display text-lg text-amber-600">
                {{ soonCount.display.value }}
              </p>
            </div>
            <div class="rounded-lg border border-bone bg-white p-2">
              <p class="text-[9px] font-medium uppercase text-fg-muted">Heures mois</p>
              <p :ref="hoursCount.el" class="font-display text-lg text-fg">
                {{ hoursCount.display.value }}
              </p>
            </div>
          </div>

          <!-- Fleet table -->
          <div class="rounded-lg border border-bone bg-white">
            <div class="border-b border-bone px-3 py-2">
              <p class="font-semibold text-fg">Flotte</p>
            </div>
            <table class="w-full text-left">
              <thead
                class="border-b border-bone bg-paper/50 text-[9px] font-medium uppercase text-fg-muted"
              >
                <tr>
                  <th class="px-3 py-1.5">Bateau</th>
                  <th class="px-3 py-1.5">Type</th>
                  <th class="px-3 py-1.5">Statut</th>
                  <th class="px-3 py-1.5">Heures</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-bone">
                <tr>
                  <td class="px-3 py-1.5 font-medium">Mistral II</td>
                  <td class="px-3 py-1.5 text-fg-muted">Voilier</td>
                  <td class="px-3 py-1.5">
                    <span
                      class="rounded-full bg-coral-100 px-1.5 py-0.5 text-[9px] font-medium text-coral-700"
                      >Retard</span
                    >
                  </td>
                  <td class="px-3 py-1.5 text-fg-muted">342h</td>
                </tr>
                <tr>
                  <td class="px-3 py-1.5 font-medium">Azur</td>
                  <td class="px-3 py-1.5 text-fg-muted">Catamaran</td>
                  <td class="px-3 py-1.5">
                    <span
                      class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700"
                      >14j</span
                    >
                  </td>
                  <td class="px-3 py-1.5 text-fg-muted">128h</td>
                </tr>
                <tr>
                  <td class="px-3 py-1.5 font-medium">Sirocco</td>
                  <td class="px-3 py-1.5 text-fg-muted">Moteur</td>
                  <td class="px-3 py-1.5">
                    <span
                      class="rounded-full bg-mint-100 px-1.5 py-0.5 text-[9px] font-medium text-mint-700"
                      >OK</span
                    >
                  </td>
                  <td class="px-3 py-1.5 text-fg-muted">89h</td>
                </tr>
                <tr>
                  <td class="px-3 py-1.5 font-medium">Alizee</td>
                  <td class="px-3 py-1.5 text-fg-muted">Voilier</td>
                  <td class="px-3 py-1.5">
                    <span
                      class="rounded-full bg-coral-100 px-1.5 py-0.5 text-[9px] font-medium text-coral-700"
                      >Retard</span
                    >
                  </td>
                  <td class="px-3 py-1.5 text-fg-muted">456h</td>
                </tr>
                <tr>
                  <td class="px-3 py-1.5 font-medium">Cap Horn</td>
                  <td class="px-3 py-1.5 text-fg-muted">Voilier</td>
                  <td class="px-3 py-1.5">
                    <span
                      class="rounded-full bg-mint-100 px-1.5 py-0.5 text-[9px] font-medium text-mint-700"
                      >OK</span
                    >
                  </td>
                  <td class="px-3 py-1.5 text-fg-muted">201h</td>
                </tr>
                <tr>
                  <td class="px-3 py-1.5 font-medium">Tramontane</td>
                  <td class="px-3 py-1.5 text-fg-muted">Moteur</td>
                  <td class="px-3 py-1.5">
                    <span
                      class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700"
                      >14j</span
                    >
                  </td>
                  <td class="px-3 py-1.5 text-fg-muted">167h</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right panel -->
        <div
          class="flex w-[160px] shrink-0 flex-col overflow-hidden border-l border-bone bg-paper/50 p-3"
        >
          <!-- AI panel -->
          <div class="mb-3 shrink-0 rounded-lg bg-violet-700 p-2 text-white">
            <div class="mb-1 flex items-center gap-1">
              <div class="h-3 w-3 rounded bg-white/30" />
              <span class="font-medium">FleetAI</span>
            </div>
            <p class="text-[9px] text-white/80">Mistral II: vidange moteur en retard de 42h.</p>
            <button
              class="mt-1.5 w-full rounded bg-white/20 px-2 py-1 text-[9px] font-medium hover:bg-white/30"
            >
              Planifier
            </button>
          </div>

          <!-- Upcoming tasks — défilement vertical continu (sous-composant) -->
          <HomeMockUpcomingTasks />
        </div>
      </div>
    </div>
  </div>
</template>
