<script setup lang="ts">
// Panneau « À venir » du mock dashboard : liste de tâches qui défile en boucle
// verticale continue (mock « vivant »). Extrait de HomeMockDashboard pour tenir
// sous la limite de 250 lignes.
// Assez d'items uniques pour que la boucle (translate -50%) reste sans couture
// même quand la liste remplit toute la hauteur du panneau.
const upcomingTasks = [
  {
    boat: 'Azur',
    label: 'Antifouling - 12 mai',
    dot: 'bg-coral-600',
    card: 'border-coral-200 bg-coral-50',
  },
  {
    boat: 'Tramontane',
    label: 'Greement - 18 mai',
    dot: 'bg-amber-600',
    card: 'border-amber-200 bg-amber-50',
  },
  {
    boat: 'Mistral II',
    label: 'Vidange moteur - 21 mai',
    dot: 'bg-coral-600',
    card: 'border-coral-200 bg-coral-50',
  },
  {
    boat: 'Sirocco',
    label: 'Controle securite - 26 mai',
    dot: 'bg-mint-600',
    card: 'border-mint-200 bg-mint-50',
  },
  {
    boat: 'Cap Horn',
    label: 'Revision hivernage - 2 juin',
    dot: 'bg-amber-600',
    card: 'border-amber-200 bg-amber-50',
  },
  {
    boat: 'Alizee',
    label: 'Changement voile - 8 juin',
    dot: 'bg-coral-600',
    card: 'border-coral-200 bg-coral-50',
  },
  {
    boat: 'Zephyr',
    label: 'Controle GPS - 14 juin',
    dot: 'bg-mint-600',
    card: 'border-mint-200 bg-mint-50',
  },
  {
    boat: 'Bora',
    label: 'Carenage - 20 juin',
    dot: 'bg-amber-600',
    card: 'border-amber-200 bg-amber-50',
  },
]

// Liste dupliquee pour un defilement en boucle sans couture (translate -50%).
const loopedTasks = [...upcomingTasks, ...upcomingTasks]
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <p class="mb-2 text-[9px] font-medium uppercase text-fg-muted">A venir</p>
    <div
      class="min-h-0 flex-1 overflow-hidden"
      style="
        mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
        -webkit-mask-image: linear-gradient(
          to bottom,
          transparent,
          #000 14%,
          #000 86%,
          transparent
        );
      "
    >
      <div class="task-scroll">
        <div
          v-for="(task, idx) in loopedTasks"
          :key="`${task.boat}-${idx}`"
          class="mb-1.5 flex items-start gap-1.5 rounded border p-1.5"
          :class="task.card"
        >
          <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" :class="task.dot" />
          <div class="min-w-0">
            <p class="font-medium text-fg">{{ task.boat }}</p>
            <p class="text-[9px] text-fg-muted">{{ task.label }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
