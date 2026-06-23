<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import type { NavigationLogCrewRow, CrewMemberOption } from '../../../../../shared/types/crew'

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

const availableMemberOptions = () => {
  const assignedIds = new Set(props.crew.map((c) => c.crewMemberId))
  return props.crewMemberOptions
    .filter((m) => !assignedIds.has(m.id))
    .map((m) => ({ label: m.fullName, value: m.id }))
}

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
        <span class="text-fg">{{ member.fullName }}</span>
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
        <a
          :href="`/boats/${boatId}/navigation-logs/${logId}/crew-role.pdf`"
          class="text-xs text-brand hover:underline"
          target="_blank"
          rel="noopener"
        >
          {{ t('crew.logCrew.downloadPdf') }}
        </a>
      </div>
    </template>
  </div>
</template>
