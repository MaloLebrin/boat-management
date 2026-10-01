<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseField from '~/components/base/BaseField.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import CrewConflictList from '~/components/crew/CrewConflictList.vue'
import CrewMemberStatusBadge from '~/components/crew/CrewMemberStatusBadge.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import {
  RESERVATION_CREW_ROLES,
  type CrewAvailabilityRow,
  type ReservationCrewRole,
} from '#shared/types/crew'

/**
 * Sélecteur d'équipiers d'une réservation (#883) : les libres d'abord, les
 * pris grisés avec ce qui les occupe. Le serveur refait le contrôle.
 */
const props = defineProps<{
  boatId: number
  reservationId: number
  availability: CrewAvailabilityRow[]
  defaultRole: ReservationCrewRole
}>()

const { t } = useT()

const form = useForm({
  crewMemberId: null as number | null,
  role: props.defaultRole,
  notes: '',
})

const roleOptions = RESERVATION_CREW_ROLES.map((role) => ({
  value: role,
  label: t(`crew.planning.roles.${role}`),
}))

const sorted = computed(() =>
  [...props.availability].sort((a, b) => Number(b.available) - Number(a.available))
)

function submit() {
  form.post(`/boats/${props.boatId}/reservations/${props.reservationId}/crew`, {
    preserveScroll: true,
    onSuccess: () => form.reset(),
  })
}
</script>

<template>
  <form class="space-y-4" data-testid="reservation-crew-form" @submit.prevent="submit">
    <fieldset>
      <legend class="mb-2 text-sm font-medium text-fg">{{ t('crew.planning.pickMember') }}</legend>
      <p v-if="availability.length === 0" class="text-sm text-fg-muted">
        {{ t('crew.planning.noMemberLeft') }}
      </p>
      <ul v-else class="max-h-80 space-y-1 overflow-y-auto">
        <li v-for="member in sorted" :key="member.id">
          <label
            :class="[
              'flex items-start gap-3 rounded-lg border px-3 py-2',
              member.available
                ? 'cursor-pointer border-border hover:bg-surface-muted'
                : 'cursor-not-allowed border-border bg-surface-muted opacity-70',
              form.crewMemberId === member.id ? 'border-brand bg-brand-soft' : '',
            ]"
            :data-testid="`crew-option-${member.id}`"
          >
            <input
              v-model="form.crewMemberId"
              type="radio"
              name="crewMemberId"
              class="mt-1"
              :value="member.id"
              :disabled="!member.available"
            />
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-medium text-fg">{{ member.fullName }}</span>
                <CrewMemberStatusBadge :status="member.certificationStatus" />
                <BaseBadge v-if="member.certificationLapses" variant="warning">
                  {{ t('crew.planning.certificationLapses') }}
                </BaseBadge>
                <BaseBadge v-if="!member.available" variant="danger">
                  {{ t('crew.planning.unavailable') }}
                </BaseBadge>
              </span>
              <CrewConflictList v-if="!member.available" :conflicts="member.conflicts" />
            </span>
          </label>
        </li>
      </ul>
      <p v-if="form.errors.crewMemberId" class="mt-1 text-sm text-danger">
        {{ form.errors.crewMemberId }}
      </p>
    </fieldset>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseField :label="t('crew.planning.role')" :error="form.errors.role">
        <BaseSelect v-model="form.role" :options="roleOptions" />
      </BaseField>
      <BaseField :label="t('crew.planning.notes')" :error="form.errors.notes">
        <BaseTextarea v-model="form.notes" :rows="2" />
      </BaseField>
    </div>

    <div class="flex justify-end">
      <BaseButton type="submit" :disabled="form.processing || form.crewMemberId === null">
        {{ t('crew.planning.assign') }}
      </BaseButton>
    </div>
  </form>
</template>
