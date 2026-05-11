<script setup lang="ts">
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">Gerez les documents de votre bateau.</p>
      <!-- TODO: implement document upload: create BoatDocument model + migration, POST /boats/:id/documents, store in S3/local -->
      <BaseButton variant="secondary" size="sm" disabled>
        + Ajouter un document
      </BaseButton>
    </div>

    <!-- TODO: remove this banner once document upload is implemented -->
    <!-- Note banner -->
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Fonctionnalite a venir : la gestion des documents sera bientot disponible.
    </div>

    <!-- Document groups -->
    <div class="space-y-6">
      <!-- TODO: implement file drag-and-drop upload using the HTML5 File API, send to POST /boats/:id/documents -->
      <!-- Reglementaire -->
      <div>
        <h3 class="text-sm font-semibold text-fg mb-3">Reglementaire</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-for="docType in ['Certificat de jauge', 'Permis de navigation', 'Assurance']" :key="docType"
            class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-6 text-center">
            <DocumentTextIcon class="h-8 w-8 text-fg-subtle mx-auto mb-2" />
            <p class="text-sm text-fg-muted">{{ docType }}</p>
            <p class="text-xs text-fg-subtle mt-1">Deposer un fichier</p>
          </div>
        </div>
      </div>

      <!-- Constructeur -->
      <div>
        <h3 class="text-sm font-semibold text-fg mb-3">Constructeur</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="docType in ['Manuel utilisateur', 'Fiche technique']" :key="docType"
            class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-6 text-center">
            <DocumentTextIcon class="h-8 w-8 text-fg-subtle mx-auto mb-2" />
            <p class="text-sm text-fg-muted">{{ docType }}</p>
            <p class="text-xs text-fg-subtle mt-1">Deposer un fichier</p>
          </div>
        </div>
      </div>

      <!-- Divers -->
      <div>
        <h3 class="text-sm font-semibold text-fg mb-3">Divers</h3>
        <div class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-8 text-center">
          <DocumentTextIcon class="h-8 w-8 text-fg-subtle mx-auto mb-2" />
          <p class="text-sm text-fg-muted">Deposer un document</p>
        </div>
      </div>
    </div>
  </div>
</template>
