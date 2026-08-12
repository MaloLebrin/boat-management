import { computed, ref } from 'vue'
import { useDateFormat } from '~/composables/use_date_format'

export function useMonthNav() {
  const { formatMonthYear, formatWeekdayShort } = useDateFormat()

  const initDate = new Date()
  const currentYear = ref(initDate.getFullYear())
  const currentMonth = ref(initDate.getMonth())

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
    formatMonthYear(new Date(currentYear.value, currentMonth.value))
  )

  const daysInMonth = computed(() =>
    new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
  )

  const firstWeekday = computed(() => {
    const d = new Date(currentYear.value, currentMonth.value, 1).getDay()
    return d === 0 ? 6 : d - 1
  })

  function isToday(day: number): boolean {
    const now = new Date()
    return (
      day === now.getDate() &&
      currentMonth.value === now.getMonth() &&
      currentYear.value === now.getFullYear()
    )
  }

  // January 2024 starts on a Monday: days 1..7 map to Monday..Sunday.
  const weekdays = computed(() =>
    [1, 2, 3, 4, 5, 6, 0].map((day) => formatWeekdayShort(new Date(2024, 0, day === 0 ? 7 : day)))
  )

  return {
    currentYear,
    currentMonth,
    prevMonth,
    nextMonth,
    monthLabel,
    daysInMonth,
    firstWeekday,
    isToday,
    weekdays,
  }
}
