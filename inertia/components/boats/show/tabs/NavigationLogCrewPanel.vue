<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import type { NavigationLogCrewRow, CrewMemberOption } from '../../../../../shared/types/crew'
import { confirmed } from '~/utils/native_dialog'

const props = defineProps<{
  boatId: number
  logId: number
  crew: NavigationLogCrewRow[]
  crewMemberOptions: CrewMemberOption[]
  canUpdate: boolean
}>()

const { t } = useT()

const showAddForm = ref(false)

const addForm = useForm({
  crewMemberId: '' as string | number,
  role: 'crew' as 'skipper' | 'crew' | 'passenger',
})

const roleOptions = [
  { label: t('crew.roles.skipper'), value: 'skipper' },
  { label: t('crew.roles.crew'), value: 'crew' },
  { label: t('crew.roles.passenger'), value: 'passenger' },
]

// État des certifications de chaque équipier (#882) : averti, jamais bloqué —
// le loueur peut avoir le certificat renouvelé en main sans l'avoir saisi.
const statusById = computed(
  () => new Map(props.crewMemberOptions.map((m) => [m.id, m.certificationStatus]))
)

function optionLabel(fullName: string, status: CrewMemberOption['certificationStatus']) {
  if (status === 'expired') return t('crew.logCrew.optionExpired', { name: fullName })
  if (status === 'expiring_soon') return t('crew.logCrew.optionExpiringSoon', { name: fullName })
  return fullName
}

const availableMemberOptions = () => {
  const assignedIds = new Set(props.crew.map((c) => c.crewMemberId))
  return props.crewMemberOptions
    .filter((m) => !assignedIds.has(m.id))
    .map((m) => ({ label: optionLabel(m.fullName, m.certificationStatus), value: m.id }))
}

const expiredCount = computed(
  () => props.crew.filter((c) => statusById.value.get(c.crewMemberId) === 'expired').length
)

function addCrewMember() {
  if (!addForm.crewMemberId) return

  const newCrew = [
    ...props.crew.map((c) => ({ crewMemberId: c.crewMemberId, role: c.role })),
    { crewMemberId: Number(addForm.crewMemberId), role: addForm.role },
  ]

  useForm({ crew: newCrew }).patch(`/boats/${props.boatId}/navigation-logs/${props.logId}/crew`, {
    preserveScroll: true,
    onSuccess: () => {
      showAddForm.value = false
      addForm.reset()
    },
  })
}

function removeCrewMember(crewMemberId: number) {
  const newCrew = props.crew
    .filter((c) => c.crewMemberId !== crewMemberId)
    .map((c) => ({ crewMemberId: c.crewMemberId, role: c.role }))

  // Removing the last crew member sends an empty list, which clears the whole
  // trip crew. Confirm first so it can't happen by an accidental click.
  if (newCrew.length === 0 && !confirmed(t('crew.logCrew.removeLastConfirm'))) {
    return
  }

  useForm({ crew: newCrew }).patch(`/boats/${props.boatId}/navigation-logs/${props.logId}/crew`, {
    preserveScroll: true,
  })
}
</script>

<template>
  <div class="mt-3 border-t border-border pt-3 space-y-2">
    <p class="text-xs font-semibold text-fg-muted uppercase tracking-wide">
      {{ t('crew.logCrew.title') }}
    </p>

    <div v-if="crew.length > 0" class="space-y-1">
      <div
        v-for="member in crew"
        :key="member.crewMemberId"
        class="flex items-center justify-between gap-2 text-sm"
      >
        <span class="flex flex-wrap items-center gap-2 text-fg">
          {{ member.fullName }}
          <BaseBadge
            v-if="statusById.get(member.crewMemberId) === 'expired'"
            variant="danger"
            data-testid="log-crew-expired"
          >
            {{ t('crew.logCrew.expiredBadge') }}
          </BaseBadge>
        </span>
        <span class="text-fg-muted">{{ t(`crew.roles.${member.role}`) }}</span>
        <BaseButton
          v-if="canUpdate"
          type="button"
          variant="ghost"
          size="sm"
          @click="removeCrewMember(member.crewMemberId)"
        >
          ×
        </BaseButton>
      </div>
    </div>
    <p v-else class="text-xs text-fg-muted">{{ t('crew.logCrew.empty') }}</p>
    <p
      v-if="expiredCount > 0"
      role="status"
      class="rounded-md bg-coral-50 px-3 py-2 text-xs text-coral-700"
      data-testid="log-crew-expired-warning"
    >
      {{ t('crew.logCrew.expiredWarning', { count: String(expiredCount) }) }}
    </p>

    <template v-if="canUpdate">
      <div v-if="showAddForm" class="flex items-end gap-2">
        <BaseSelect
          v-model="addForm.crewMemberId"
          :label="t('crew.logCrew.member')"
          :options="availableMemberOptions()"
          allow-empty
          class="flex-1"
        />
        <BaseSelect
          v-model="addForm.role"
          :label="t('crew.logCrew.role')"
          :options="roleOptions"
          class="w-36"
        />
        <BaseButton type="button" variant="primary" size="sm" @click="addCrewMember">
          {{ t('crew.form.submit') }}
        </BaseButton>
        <BaseButton type="button" variant="ghost" size="sm" @click="showAddForm = false">
          {{ t('crew.form.cancel') }}
        </BaseButton>
      </div>

      <div class="flex items-center gap-3">
        <BaseButton
          v-if="!showAddForm && availableMemberOptions().length > 0"
          type="button"
          variant="ghost"
          size="sm"
          @click="showAddForm = true"
        >
          + {{ t('crew.logCrew.add') }}
        </BaseButton>
        <!-- eslint-disable vue/no-restricted-v-bind -- téléchargement PDF : une visite Inertia rendrait le binaire comme une page -->
        <a
          :href="`/boats/${boatId}/navigation-logs/${logId}/crew-role.pdf`"
          class="text-xs text-brand hover:underline"
          target="_blank"
          rel="noopener"
        >
          {{ t('crew.logCrew.downloadPdf') }}
        </a>
        <!-- eslint-enable vue/no-restricted-v-bind -->
      </div>
    </template>
  </div>
</template>
