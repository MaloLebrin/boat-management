import { computed, ref } from 'vue'
import { useT } from '~/composables/use_t'

export function useMonthNav() {
  const { locale } = useT()

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
    new Date(currentYear.value, currentMonth.value).toLocaleDateString(locale.value, {
      month: 'long',
      year: 'numeric',
    })
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

  const weekdays = computed(() => {
    const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
    return [1, 2, 3, 4, 5, 6, 0].map((day) => {
      const date = new Date(2024, 0, day === 0 ? 7 : day)
      const label = formatter.format(date)
      return label.charAt(0).toUpperCase() + label.slice(1, 3)
    })
  })

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
