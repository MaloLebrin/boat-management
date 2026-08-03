/**
 * Préférence de thème de l'interface (issue #416).
 *
 * `system` est la valeur par défaut : elle délègue à `prefers-color-scheme`,
 * résolu côté client avant le premier paint. `light` / `dark` forcent le thème
 * quel que soit le réglage de l'OS.
 */
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

/**
 * Thème réellement appliqué sur `<html data-theme="…">`. `system` n'apparaît
 * jamais ici : il est toujours résolu vers l'une de ces deux valeurs.
 */
export type ResolvedTheme = 'light' | 'dark'

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference)
}
