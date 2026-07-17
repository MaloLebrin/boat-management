import { PROPULSION_OPTIONS } from '../../shared/constants/boats/boat_form_options'

/**
 * Translated label for a boat's propulsion type enum value.
 * Falls back to the raw value for legacy/unknown values instead of a raw i18n key.
 */
export function propulsionLabel(
  t: (key: string) => string,
  value: string | null | undefined
): string | null {
  if (!value) return null
  const isKnown = PROPULSION_OPTIONS.some((option) => option.value === value)
  return isKnown ? t(`boats.options.propulsion.${value}`) : value
}
