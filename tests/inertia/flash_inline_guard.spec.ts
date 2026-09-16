import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'

const ROOT = join(__dirname, '../../inertia')

function vueFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.vue'))
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)))
}

function offenders(files: string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(join(ROOT, file), 'utf8')))
}

/**
 * Garde de la vague 3.2 : le flash partagé par le middleware Inertia n'a
 * qu'un rendu, le toast des layouts (`useFlashToasts`). Aucune page ni
 * composant ne le relit pour l'afficher en bandeau ; `useFlash()` reste
 * réservé aux écrans qui en font un **état** (confirmation d'envoi du mot de
 * passe oublié, retour de la démo), jamais un second message.
 */
describe('Flash inline guard', () => {
  const pages = vueFiles('pages')
  const components = vueFiles('components')

  test('no page reads page.props.flash directly', () => {
    expect(offenders(pages, /props\.flash/)).toEqual([])
  })

  test('no component reads page.props.flash directly', () => {
    expect(offenders(components, /props\.flash/)).toEqual([])
  })

  test('no page renders a flash message in a BaseAlert', () => {
    expect(offenders(pages, /v-if="flash\??\.(success|error|info)"/)).toEqual([])
  })

  test('only the marketing demo section, outside any toaster, keeps an inline flash error', () => {
    // Le layout public ne monte pas de <Toaster> : la section démo de la home
    // garde son bandeau. Toute autre lecture d'`errorMessage` est un doublon.
    expect(offenders(components, /useFlash\(\)/)).toEqual([
      'components/marketing/home/HomeDemoSection.vue',
    ])
  })
})
