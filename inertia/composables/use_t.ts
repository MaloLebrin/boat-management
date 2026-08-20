import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

type Vars = Record<string, string | number>

const PLURAL_RE = /\{(\w+),\s*plural,\s*((?:\w+\s*\{[^{}]*\}\s*)+)\}/g
const PLURAL_BRANCH_RE = /(\w+)\s*\{([^{}]*)\}/g

function parsePluralBranches(branches: string): Record<string, string> {
  const result: Record<string, string> = {}
  let match: RegExpExecArray | null
  PLURAL_BRANCH_RE.lastIndex = 0
  while ((match = PLURAL_BRANCH_RE.exec(branches))) {
    result[match[1]] = match[2]
  }
  return result
}

function resolvePlurals(str: string, vars: Vars, locale: string): string {
  return str.replace(PLURAL_RE, (_, varName: string, branches: string) => {
    const count = Number(vars[varName] ?? 0)
    const options = parsePluralBranches(branches)
    const category = new Intl.PluralRules(locale).select(count)
    const branch = options[category] ?? options.other ?? ''
    return branch.replace(/#/g, String(count))
  })
}

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
    const withPlurals = vars ? resolvePlurals(raw, vars, locale.value) : raw
    return interpolate(withPlurals, vars)
  }

  return { t, locale }
}
