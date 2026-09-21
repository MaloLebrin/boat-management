<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BoatIncidentModal from '~/components/boats/incidents/BoatIncidentModal.vue'
import IncidentShowHeader from '~/components/boats/incidents/show/IncidentShowHeader.vue'
import IncidentShowTabPhotos from '~/components/boats/incidents/show/IncidentShowTabPhotos.vue'
import { useT } from '~/composables/use_t'
import type { BoatIncidentRow, MediaRow } from '~/types/boat_show'
import { confirmDelete } from '~/utils/native_dialog'

/**
 * Page de détail d'un incident (#814) : support des photos (le pipeline média
 * redirige toujours vers une page) et, à venir, des suites tâche/action (#815).
 * L'édition rouvre la modale sans données équipement : la cible se change
 * depuis l'onglet Incidents de la fiche bateau.
 */
const props = defineProps<{
  boat: { id: number; name: string }
  incident: BoatIncidentRow
  photos: MediaRow[]
  canManage: boolean
  canDelete: boolean
}>()

const { t } = useT()
const isEditOpen = ref(false)

function deleteIncident() {
  confirmDelete(
    t('incidents.form.confirmDelete'),
    `/boats/${props.boat.id}/incidents/${props.incident.id}`
  )
}
</script>

<template>
  <Head :title="t(`incidents.type.${incident.type}`)" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      class="mb-4"
      :items="[
        { label: t('boats.index.title'), href: '/boats' },
        { label: boat.name, href: `/boats/${boat.id}` },
        { label: t('incidents.show.breadcrumb'), href: `/boats/${boat.id}?tab=incidents` },
        { label: t(`incidents.type.${incident.type}`) },
      ]"
    />

    <IncidentShowHeader
      :boat-id="boat.id"
      :incident="incident"
      :can-manage="canManage"
      :can-delete="canDelete"
      @edit="isEditOpen = true"
      @delete="deleteIncident"
    />

    <div class="mt-8 space-y-6">
      <BaseCard padded>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {{ t('incidents.show.detail') }}
        </p>
        <p class="text-sm text-fg whitespace-pre-wrap">{{ incident.description }}</p>
      </BaseCard>

      <IncidentShowTabPhotos
        :boat-id="boat.id"
        :incident-id="incident.id"
        :photos="photos"
        :can-manage="canManage"
      />
    </div>

    <BoatIncidentModal
      v-if="canManage"
      v-model:open="isEditOpen"
      :boat-id="boat.id"
      :editing-incident="incident"
    />
  </div>
</template>
