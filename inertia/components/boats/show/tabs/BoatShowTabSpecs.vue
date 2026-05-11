<script setup lang="ts">
import { WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import type { BoatShowDetail } from '~/types/boat_show'

defineProps<{
  boat: BoatShowDetail
}>()
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Left column -->
    <div class="flex-1 space-y-6">
      <!-- Identite card -->
      <BaseCard padded>
        <template #header>
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-fg">Identite</p>
            <a :href="`/boats/${boat.id}/edit`">
              <BaseButton variant="ghost" size="sm">Modifier</BaseButton>
            </a>
          </div>
        </template>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">Nom</dt>
            <dd class="font-semibold text-fg">{{ boat.name }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Type</dt>
            <dd class="font-semibold text-fg">{{ boat.type ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Immatriculation</dt>
            <dd class="font-semibold text-fg">{{ boat.registrationNumber ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Annee de construction</dt>
            <dd class="font-semibold text-fg">{{ boat.yearBuilt ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Constructeur</dt>
            <dd class="font-semibold text-fg">{{ boat.manufacturer ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Modele</dt>
            <dd class="font-semibold text-fg">{{ boat.model ?? '—' }}</dd>
          </div>
        </dl>
      </BaseCard>

      <!-- Dimensions card -->
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">Dimensions</p>
        </template>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">Longueur</dt>
            <dd class="font-semibold text-fg">{{ boat.lengthM ? `${boat.lengthM} m` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Bau</dt>
            <dd class="font-semibold text-fg">{{ boat.beamM ? `${boat.beamM} m` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Tirant d'eau</dt>
            <dd class="font-semibold text-fg">{{ boat.draftM ? `${boat.draftM} m` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Hauteur de mat</dt>
            <dd class="font-semibold text-fg">{{ boat.mastHeightM ? `${boat.mastHeightM} m` : '—' }}</dd>
          </div>
        </dl>
      </BaseCard>

      <!-- Coque & materiaux card -->
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">Coque & materiaux</p>
        </template>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">Materiau coque</dt>
            <dd class="font-semibold text-fg">{{ boat.hullMaterial ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Propulsion</dt>
            <dd class="font-semibold text-fg">{{ boat.propulsionType ?? '—' }}</dd>
          </div>
        </dl>
      </BaseCard>

      <!-- Equipements a bord card -->
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">Equipements a bord</p>
        </template>
        <dl class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">Moteurs</dt>
            <dd class="font-semibold text-fg">{{ boat.engines.length }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Voiles</dt>
            <dd class="font-semibold text-fg">{{ boat.sails.length }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">Greement</dt>
            <dd class="font-semibold text-fg">{{ boat.rig ? 'Oui' : 'Non' }}</dd>
          </div>
        </dl>
      </BaseCard>
    </div>

    <!-- Right column (w-64) -->
    <div class="w-full lg:w-64 space-y-6">
      <BaseCard padded>
        <div class="flex items-start gap-3">
          <WrenchScrewdriverIcon class="h-5 w-5 text-fg-muted shrink-0" />
          <p class="text-sm text-fg-muted">
            Les specifications peuvent etre modifiees dans la page d'edition du bateau.
          </p>
        </div>
        <div class="mt-4">
          <a :href="`/boats/${boat.id}/edit`">
            <BaseButton variant="secondary" size="sm" class="w-full">
              Modifier le bateau
            </BaseButton>
          </a>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
