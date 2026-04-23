import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

type Vars = Record<string, string | number>

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}

export function useT() {
  const page = usePage()

  const appT = computed(() => (page.props as any).appT as Record<string, string> | undefined)
  const locale = computed(() => ((page.props as any).locale as string | undefined) ?? 'en')

  function t(key: string, vars?: Vars): string {
    const raw = appT.value?.[key]
    if (typeof raw !== 'string') return key
    return interpolate(raw, vars)
  }

  return { t, locale }
}
