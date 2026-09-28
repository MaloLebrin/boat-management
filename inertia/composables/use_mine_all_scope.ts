import {
  computed,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import { useT } from '~/composables/use_t'

export type MineAllScope = 'mine' | 'all'

interface MineAllScopeLabelKeys {
  mine: string
  all: string
}

interface UseMineAllScopeReturn {
  scope: Ref<MineAllScope>
  scopeOptions: ComputedRef<{ value: MineAllScope; label: string }[]>
  /** Setter pour `BaseSegmentedControl` : toute valeur autre que `'mine'` vaut `'all'`. */
  setScope: (value: unknown) => void
}

/**
 * Bascule « mes tâches / toutes » (#868). La valeur initiale peut être
 * réactive : quand elle change (prop différée qui arrive), la bascule s'y
 * réaligne.
 */
export function useMineAllScope(
  initial: MaybeRefOrGetter<MineAllScope>,
  labelKeys: MineAllScopeLabelKeys
): UseMineAllScopeReturn {
  const { t } = useT()

  const scope = ref<MineAllScope>(toValue(initial))
  watch(
    () => toValue(initial),
    (value) => (scope.value = value)
  )

  const scopeOptions = computed(() => [
    { value: 'mine' as const, label: t(labelKeys.mine) },
    { value: 'all' as const, label: t(labelKeys.all) },
  ])

  function setScope(value: unknown) {
    scope.value = value === 'mine' ? 'mine' : 'all'
  }

  return { scope, scopeOptions, setScope }
}
