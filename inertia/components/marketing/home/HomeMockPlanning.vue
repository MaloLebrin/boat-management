<script setup lang="ts">
</script>

<template>
  <div class="flex h-full w-full overflow-hidden rounded-lg bg-cream" style="font-size: 10px">
    <!-- Sidebar -->
    <div
      class="flex w-[140px] shrink-0 flex-col"
      style="background: linear-gradient(180deg, #0b1d2e 0%, #102a40 100%)"
    >
      <div class="flex items-center gap-1.5 px-3 py-3">
        <svg width="16" height="16" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="#faf6ee" stroke-width="3" />
          <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#faf6ee" />
          <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
        </svg>
        <span class="font-display text-[11px] text-white">Fleet<em class="text-coral-500">Ai</em></span>
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
        <div class="flex items-center gap-1.5 rounded bg-white/10 px-2 py-1.5 text-white">
          <div class="h-3 w-3 rounded bg-white/30" />
          <span>Planning</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-1.5 text-white/50">
          <div class="h-3 w-3 rounded bg-white/20" />
          <span>Historique</span>
        </div>
      </nav>
    </div>

    <!-- Main content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-bone bg-white px-4 py-2">
        <div>
          <p class="font-semibold text-fg">Planning maintenance</p>
          <p class="text-[9px] text-fg-muted">Mai 2025</p>
        </div>
        <div class="flex items-center gap-1">
          <span class="rounded-l bg-navy-100 px-2 py-1 text-[9px] font-medium text-navy-700">Calendrier</span>
          <span class="rounded-r bg-paper px-2 py-1 text-[9px] text-fg-muted">Kanban</span>
        </div>
      </div>

      <!-- Calendar -->
      <div class="flex-1 overflow-auto p-3">
        <div class="rounded-lg border border-bone bg-white">
          <!-- Calendar header -->
          <div class="grid grid-cols-7 border-b border-bone bg-paper/50">
            <div class="px-2 py-1.5 text-center text-[9px] font-medium text-fg-muted">Lun</div>
            <div class="px-2 py-1.5 text-center text-[9px] font-medium text-fg-muted">Mar</div>
            <div class="px-2 py-1.5 text-center text-[9px] font-medium text-fg-muted">Mer</div>
            <div class="px-2 py-1.5 text-center text-[9px] font-medium text-fg-muted">Jeu</div>
            <div class="px-2 py-1.5 text-center text-[9px] font-medium text-fg-muted">Ven</div>
            <div class="px-2 py-1.5 text-center text-[9px] font-medium text-fg-muted">Sam</div>
            <div class="px-2 py-1.5 text-center text-[9px] font-medium text-fg-muted">Dim</div>
          </div>

          <!-- Week 1 -->
          <div class="grid grid-cols-7 border-b border-bone">
            <div class="min-h-[48px] border-r border-bone p-1 text-fg-subtle">28</div>
            <div class="min-h-[48px] border-r border-bone p-1 text-fg-subtle">29</div>
            <div class="min-h-[48px] border-r border-bone p-1 text-fg-subtle">30</div>
            <div class="min-h-[48px] border-r border-bone p-1">1</div>
            <div class="min-h-[48px] border-r border-bone p-1">2</div>
            <div class="min-h-[48px] border-r border-bone p-1">3</div>
            <div class="min-h-[48px] p-1">4</div>
          </div>

          <!-- Week 2 -->
          <div class="grid grid-cols-7 border-b border-bone">
            <div class="min-h-[48px] border-r border-bone p-1">
              <span>5</span>
              <div class="mt-0.5 rounded bg-coral-100 px-1 py-0.5 text-[8px] text-coral-700">Mistral II</div>
            </div>
            <div class="min-h-[48px] border-r border-bone p-1">6</div>
            <div class="min-h-[48px] border-r border-bone p-1">7</div>
            <div class="min-h-[48px] border-r border-bone p-1">8</div>
            <div class="min-h-[48px] border-r border-bone p-1">9</div>
            <div class="min-h-[48px] border-r border-bone p-1">10</div>
            <div class="min-h-[48px] p-1">11</div>
          </div>

          <!-- Week 3 -->
          <div class="grid grid-cols-7 border-b border-bone">
            <div class="min-h-[48px] border-r border-bone p-1">
              <span>12</span>
              <div class="mt-0.5 rounded bg-amber-100 px-1 py-0.5 text-[8px] text-amber-700">Azur</div>
            </div>
            <div class="min-h-[48px] border-r border-bone p-1">13</div>
            <div class="min-h-[48px] border-r border-bone p-1">14</div>
            <div class="min-h-[48px] border-r border-bone p-1">
              <span>15</span>
              <div class="mt-0.5 rounded bg-navy-100 px-1 py-0.5 text-[8px] text-navy-700">Sirocco</div>
            </div>
            <div class="min-h-[48px] border-r border-bone p-1">16</div>
            <div class="min-h-[48px] border-r border-bone p-1">17</div>
            <div class="min-h-[48px] p-1">
              <span>18</span>
              <div class="mt-0.5 rounded bg-amber-100 px-1 py-0.5 text-[8px] text-amber-700">Tramontane</div>
            </div>
          </div>

          <!-- Week 4 -->
          <div class="grid grid-cols-7 border-b border-bone">
            <div class="min-h-[48px] border-r border-bone p-1">19</div>
            <div class="min-h-[48px] border-r border-bone p-1">
              <span>20</span>
              <div class="mt-0.5 rounded bg-mint-100 px-1 py-0.5 text-[8px] text-mint-700">Cap Horn</div>
            </div>
            <div class="min-h-[48px] border-r border-bone p-1">21</div>
            <div class="min-h-[48px] border-r border-bone p-1">22</div>
            <div class="min-h-[48px] border-r border-bone p-1">23</div>
            <div class="min-h-[48px] border-r border-bone p-1">24</div>
            <div class="min-h-[48px] p-1">25</div>
          </div>

          <!-- Week 5 -->
          <div class="grid grid-cols-7">
            <div class="min-h-[48px] border-r border-bone p-1">26</div>
            <div class="min-h-[48px] border-r border-bone p-1">27</div>
            <div class="min-h-[48px] border-r border-bone p-1">
              <span>28</span>
              <div class="mt-0.5 rounded bg-coral-100 px-1 py-0.5 text-[8px] text-coral-700">Alizee</div>
            </div>
            <div class="min-h-[48px] border-r border-bone p-1">29</div>
            <div class="min-h-[48px] border-r border-bone p-1">30</div>
            <div class="min-h-[48px] border-r border-bone p-1">31</div>
            <div class="min-h-[48px] p-1 text-fg-subtle">1</div>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-2 flex items-center gap-3 text-[9px]">
          <div class="flex items-center gap-1">
            <div class="h-2 w-2 rounded bg-coral-400" />
            <span class="text-fg-muted">En retard</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-2 w-2 rounded bg-amber-400" />
            <span class="text-fg-muted">Sous 14j</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-2 w-2 rounded bg-navy-400" />
            <span class="text-fg-muted">Planifie</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-2 w-2 rounded bg-mint-400" />
            <span class="text-fg-muted">Termine</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
