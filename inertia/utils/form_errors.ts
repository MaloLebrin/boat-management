export type FormErrors = Record<string, string | string[] | undefined>

export function getFieldError(
  errors: FormErrors | undefined,
  key: string | undefined
): string | undefined {
  if (!errors || !key) return undefined
  const v = errors[key]
  if (!v) return undefined
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : undefined
  return undefined
}

/**
 * Convert an HTML field name to a dot-notation error key.
 *
 * Examples:
 * - `foo` -> `foo`
 * - `parts[0][name]` -> `parts.0.name`
 * - `items[12].value` -> `items.12.value`
 */
export function nameToErrorKey(name: string): string {
  if (!name) return ''

  // Normalize bracket segments to dot segments: parts[0][name] -> parts.0.name
  // Also handles mixed: items[12].value -> items.12.value
  const withDots = name.replace(/\[(\d+)\]/g, '.$1').replace(/\[([^\]]+)\]/g, '.$1')

  // Collapse accidental consecutive dots and trim.
  return withDots.replace(/\.+/g, '.').replace(/^\./, '').replace(/\.$/, '')
}
