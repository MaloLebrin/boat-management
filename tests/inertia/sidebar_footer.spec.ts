import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

/**
 * Pied de sidebar allégé : la langue et le thème ne se changent plus depuis le
 * menu latéral, uniquement depuis Réglages › Mon compte.
 */
describe('pied de la sidebar', () => {
  test.each([
    'inertia/components/layout/AsideMenu.vue',
    'inertia/components/layout/MobileSidebarDrawer.vue',
  ])('%s ne propose plus les switchs de langue et de thème', (path) => {
    const content = source(path)
    expect(content).not.toContain('LanguageSwitcher')
    expect(content).not.toContain('ThemeSwitcher')
  })

  test('les réglages Mon compte gardent les cartes Langue et Thème', () => {
    const content = source('inertia/components/settings/tabs/SettingsMeTab.vue')
    expect(content).toContain('<LanguageCard />')
    expect(content).toContain('<ThemeCard />')
  })
})
