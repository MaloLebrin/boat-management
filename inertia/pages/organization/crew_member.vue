<script setup lang="ts">
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import CrewCertificationBadge from '~/components/crew/CrewCertificationBadge.vue'
import CrewMemberHistory from '~/components/crew/CrewMemberHistory.vue'
import CrewMemberStatusBadge from '~/components/crew/CrewMemberStatusBadge.vue'
import CrewUnavailabilityPanel from '~/components/crew/CrewUnavailabilityPanel.vue'
import { useT } from '~/composables/use_t'
import type {
  CrewMemberHistoryEntry,
  CrewMemberRow,
  CrewUnavailabilityRow,
} from '#shared/types/crew'

/**
 * Fiche équipier (#883) : coordonnées, certifications, embarquements et —
 * avec le module Location — indisponibilités.
 */
const props = defineProps<{
  member: CrewMemberRow
  history: CrewMemberHistoryEntry[]
  unavailabilities: CrewUnavailabilityRow[]
  planningEnabled: boolean
  canUpdate: boolean
}>()

const { t } = useT()

const breadcrumbs = computed(() => [
  { label: t('crew.title'), href: '/crew' },
  { label: props.member.fullName },
])
</script>

<template>
  <Head :title="member.fullName" />

  <div class="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumbs" />

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <BaseHeading level="1">{{ member.fullName }}</BaseHeading>
      <CrewMemberStatusBadge :status="member.certificationStatus" />
    </div>
    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
      <span v-if="member.email">{{ member.email }}</span>
      <span v-if="member.phone">{{ member.phone }}</span>
    </div>
    <p v-if="member.notes" class="mt-2 text-sm whitespace-pre-wrap text-fg-muted">
      {{ member.notes }}
    </p>

    <BaseCard class="mt-6">
      <h2 class="mb-3 text-lg font-semibold text-fg">{{ t('crew.planning.certifications') }}</h2>
      <div v-if="member.certifications.length > 0" class="space-y-1">
        <CrewCertificationBadge
          v-for="cert in member.certifications"
          :key="cert.id"
          :certification="cert"
        />
      </div>
      <p v-else class="text-sm text-fg-muted">{{ t('crew.planning.noCertification') }}</p>
    </BaseCard>

    <BaseCard v-if="planningEnabled" class="mt-6">
      <h2 class="mb-3 text-lg font-semibold text-fg">
        {{ t('crew.planning.unavailability.title') }}
      </h2>
      <CrewUnavailabilityPanel
        :member-id="member.id"
        :unavailabilities="unavailabilities"
        :can-update="canUpdate"
      />
    </BaseCard>

    <BaseCard class="mt-6">
      <h2 class="mb-3 text-lg font-semibold text-fg">{{ t('crew.planning.history.title') }}</h2>
      <CrewMemberHistory :history="history" />
    </BaseCard>
  </div>
</template>
