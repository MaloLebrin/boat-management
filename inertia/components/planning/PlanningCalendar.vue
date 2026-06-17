<script setup lang="ts">
import type { PlanningTask } from '#shared/types/planning'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import PlanningCalendarHourTasks from '~/components/planning/PlanningCalendarHourTasks.vue'
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  tasks: PlanningTask[]
}>()

const { t, locale } = useT()

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const monthLabel = computed(() =>
  new Date(currentYear.value, currentMonth.value).toLocaleDateString(locale.value, {
    month: 'long',
    year: 'numeric',
  })
)

const weekdays = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const date = new Date(2024, 0, day === 0 ? 7 : day)
    const label = formatter.format(date)
    return label.charAt(0).toUpperCase() + label.slice(1, 3)
  })
})

const daysInMonth = computed(() => new Date(currentYear.value, currentMonth.value + 1, 0).getDate())
const firstWeekday = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value, 1).getDay()
  return d === 0 ? 6 : d - 1
})

const calendarDays = computed(() => {
  const days: Array<{ day: number; tasks: PlanningTask[] }> = []
  for (let d = 1; d <= daysInMonth.value; d++) {
    const iso = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      day: d,
      tasks: props.tasks.filter((task) => task.dueAt === iso),
    })
  }
  return days
})

const agendaDays = computed(() => calendarDays.value.filter((d) => d.tasks.length > 0))
const tasksWithoutDate = computed(() =>
  props.tasks.filter((task) => !task.dueAt && task.kind === 'date')
)
const hourTasks = computed(() => props.tasks.filter((task) => task.kind === 'hours'))

function taskPillClass(task: PlanningTask): string {
  const dueDate = task.dueAt
  if (!dueDate) return 'bg-navy-600 text-white'
  const todayIso = today.toISOString().slice(0, 10)
  if (dueDate < todayIso) return 'bg-red-500 text-white'
  const soon = new Date(today)
  soon.setDate(soon.getDate() + 30)
  if (new Date(dueDate) <= soon) return 'bg-amber-500 text-white'
  return 'bg-navy-600 text-white'
}

function agendaDayLabel(day: number): string {
  return new Date(currentYear.value, currentMonth.value, day).toLocaleDateString(locale.value, {
    weekday: 'short',
    day: 'numeric',
  })
}

function isToday(day: number): boolean {
  return (
    day === today.getDate() &&
    currentMonth.value === today.getMonth() &&
    currentYear.value === today.getFullYear()
  )
}
</script>

<template>
  <div class="space-y-6">
    <BaseCard>
      <template #header>
        <div class="flex items-center justify-between">
          <BaseButton variant="ghost" size="sm" @click="prevMonth">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </BaseButton>
          <h2 class="text-sm font-semibold capitalize text-fg">{{ monthLabel }}</h2>
          <BaseButton variant="ghost" size="sm" @click="nextMonth">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </BaseButton>
        </div>
      </template>

      <!-- Mobile: agenda list -->
      <div class="sm:hidden">
        <div v-if="agendaDays.length === 0" class="py-8 text-center text-sm text-fg-muted">
          {{ t('planning.calendar.agendaEmpty') }}
        </div>
        <div v-else class="divide-y divide-border">
          <div v-for="cell in agendaDays" :key="cell.day" class="flex gap-3 py-3">
            <div class="w-12 shrink-0 text-center">
              <span
                class="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                :class="isToday(cell.day) ? 'bg-navy-500 text-white' : 'text-fg-muted'"
              >
                {{ cell.day }}
              </span>
              <p class="mt-0.5 text-xs text-fg-muted capitalize">{{ agendaDayLabel(cell.day) }}</p>
            </div>
            <div class="flex-1 space-y-1.5">
              <div
                v-for="task in cell.tasks"
                :key="task.id"
                :class="[
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium cursor-pointer hover:opacity-80',
                  taskPillClass(task),
                ]"
                @click="router.visit(`/boats/${task.boatId}`)"
              >
                <span class="truncate">{{ task.title }}</span>
                <span class="ml-auto shrink-0 text-xs opacity-75">{{ task.boatName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop: 7-column calendar grid -->
      <div class="hidden sm:block">
        <div class="mb-1 grid grid-cols-7 text-center">
          <div v-for="day in weekdays" :key="day" class="py-1 text-xs font-semibold text-fg-muted">
            {{ day }}
          </div>
        </div>
        <div class="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-border">
          <div
            v-for="n in firstWeekday"
            :key="`empty-${n}`"
            class="min-h-20 bg-surface-muted/40 p-1"
          />
          <div
            v-for="cell in calendarDays"
            :key="cell.day"
            class="min-h-20 bg-surface-elevated p-1.5"
            :class="isToday(cell.day) ? 'ring-2 ring-inset ring-navy-500' : ''"
          >
            <span
              class="mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
              :class="isToday(cell.day) ? 'bg-navy-500 text-white' : 'text-fg-muted'"
            >
              {{ cell.day }}
            </span>
            <div class="space-y-0.5">
              <div
                v-for="task in cell.tasks.slice(0, 3)"
                :key="task.id"
                :class="[
                  'truncate rounded px-1 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80',
                  taskPillClass(task),
                ]"
                :title="task.boatName + ' · ' + task.title"
                @click="router.visit(`/boats/${task.boatId}`)"
              >
                {{ task.title }}
              </div>
              <div
                v-if="cell.tasks.length > 3"
                class="rounded bg-surface-muted px-1 py-0.5 text-xs text-fg-muted"
              >
                {{ t('planning.calendar.more', { count: String(cell.tasks.length - 3) }) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Tasks without date -->
    <BaseCard v-if="tasksWithoutDate.length > 0">
      <template #header>
        <h2 class="text-sm font-semibold text-fg">{{ t('planning.calendar.withoutDate') }}</h2>
      </template>
      <div class="space-y-2">
        <div
          v-for="task in tasksWithoutDate"
          :key="task.id"
          class="flex items-center justify-between rounded-lg border border-border px-3 py-2"
        >
          <div>
            <p class="text-sm font-medium text-fg">{{ task.title }}</p>
            <p class="text-xs text-fg-muted">{{ task.boatName }} · {{ task.subject }}</p>
          </div>
          <BaseButton variant="ghost" size="sm" :route="`/boats/${task.boatId}`">
            {{ t('planning.calendar.schedule') }}
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <PlanningCalendarHourTasks :tasks="hourTasks" />
  </div>
</template>
