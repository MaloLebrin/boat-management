<script setup lang="ts"></script>

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
        <div class="flex items-center gap-1.5 rounded bg-violet-600/30 px-2 py-1 text-violet-100">
          <div class="h-3 w-3 rounded bg-violet-400" />
          <span class="font-medium">FleetAI</span>
        </div>
      </div>
    </div>

    <!-- Main content (faded) -->
    <div class="flex flex-1 flex-col overflow-hidden opacity-40">
      <div class="flex items-center justify-between border-b border-bone bg-white px-4 py-2">
        <p class="font-semibold text-fg">Dashboard</p>
      </div>
      <div class="flex-1 p-3">
        <div class="mb-3 grid grid-cols-3 gap-2">
          <div class="h-16 rounded-lg border border-bone bg-white" />
          <div class="h-16 rounded-lg border border-bone bg-white" />
          <div class="h-16 rounded-lg border border-bone bg-white" />
        </div>
        <div class="h-32 rounded-lg border border-bone bg-white" />
      </div>
    </div>

    <!-- FleetAI panel -->
    <div
      class="flex w-[200px] shrink-0 flex-col border-l border-violet-600/20"
      style="background: linear-gradient(180deg, #5a4a8a 0%, #4a3a7a 100%)"
    >
      <!-- Header -->
      <div class="border-b border-white/10 px-3 py-2">
        <div class="flex items-center gap-1.5">
          <div
            class="flex h-5 w-5 items-center justify-center rounded bg-white/20 text-xs text-white"
          >
            <span>&#10024;</span>
          </div>
          <span class="font-medium text-white">FleetAI</span>
        </div>
        <p class="mt-0.5 text-[9px] text-white/60">Copilote IA pour ta flotte</p>
      </div>

      <!-- Chat messages -->
      <div class="flex-1 overflow-auto p-3">
        <!-- User message -->
        <div class="mb-3 ml-4 rounded-lg rounded-br-sm bg-navy-800 p-2 text-white">
          <p class="text-[10px]">Quelles maintenances sont urgentes cette semaine ?</p>
        </div>

        <!-- AI response -->
        <div class="mb-3 rounded-lg rounded-bl-sm bg-white p-2">
          <p class="text-[10px] text-fg">
            Tu as <strong class="text-coral-600">3 maintenances urgentes</strong> cette semaine :
          </p>
          <ul class="mt-1.5 space-y-1 text-[9px] text-fg-muted">
            <li class="flex items-start gap-1">
              <span class="mt-0.5 text-coral-500">&#8226;</span>
              <span><strong>Mistral II</strong> : Vidange moteur (retard 42h)</span>
            </li>
            <li class="flex items-start gap-1">
              <span class="mt-0.5 text-coral-500">&#8226;</span>
              <span><strong>Alizee</strong> : Controle greement (retard 3j)</span>
            </li>
            <li class="flex items-start gap-1">
              <span class="mt-0.5 text-amber-500">&#8226;</span>
              <span><strong>Azur</strong> : Antifouling (dans 5j)</span>
            </li>
          </ul>

          <!-- Action buttons -->
          <div class="mt-2 flex flex-wrap gap-1">
            <button
              class="rounded bg-violet-100 px-2 py-0.5 text-[9px] font-medium text-violet-700 hover:bg-violet-200"
            >
              Planifier Mistral II
            </button>
            <button
              class="rounded bg-violet-100 px-2 py-0.5 text-[9px] font-medium text-violet-700 hover:bg-violet-200"
            >
              Voir details
            </button>
          </div>
        </div>

        <!-- User message -->
        <div class="mb-3 ml-4 rounded-lg rounded-br-sm bg-navy-800 p-2 text-white">
          <p class="text-[10px]">Planifie la vidange pour demain 9h</p>
        </div>

        <!-- AI response -->
        <div class="rounded-lg rounded-bl-sm bg-white p-2">
          <p class="text-[10px] text-fg">
            <span class="text-mint-600">&#10003;</span> Tache creee pour
            <strong>Mistral II</strong> :
          </p>
          <div class="mt-1.5 rounded border border-bone bg-paper p-1.5 text-[9px]">
            <p class="font-medium text-fg">Vidange moteur</p>
            <p class="text-fg-muted">Demain 9h00 - Ponton B-12</p>
          </div>
        </div>
      </div>

      <!-- Input bar -->
      <div class="border-t border-white/10 p-2">
        <div class="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5">
          <input
            type="text"
            placeholder="Pose ta question..."
            class="flex-1 bg-transparent text-[10px] text-white placeholder-white/50 outline-none"
            disabled
          />
          <button
            class="flex h-5 w-5 items-center justify-center rounded bg-white/20 text-white hover:bg-white/30"
          >
            <svg
              class="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
