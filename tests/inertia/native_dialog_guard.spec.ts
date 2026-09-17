import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'

const ROOT = join(__dirname, '../../inertia')

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && (entry.name.endsWith('.vue') || entry.name.endsWith('.ts'))
    )
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)))
}

function offenders(files: string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(join(ROOT, file), 'utf8')))
}

/**
 * Garde de la vague 3.5 : la confirmation native n'a plus qu'un appelant,
 * `utils/native_dialog.ts`. Ailleurs, un `confirm()` nu lève côté SSR, et
 * disperser ces dialogues rend impossible leur passage groupé à
 * `BaseConfirmModal`. Les écrans qui confirment dans l'app continuent de
 * passer par leur modale — cette garde ne regarde que le dialogue natif.
 */
describe('Confirmation native', () => {
  const files = [
    ...sourceFiles('pages'),
    ...sourceFiles('components'),
    ...sourceFiles('composables'),
  ]

  test('aucune page, composant ou composable n’appelle `window.confirm`', () => {
    expect(offenders(files, /window\.confirm\s*\(/)).toEqual([])
  })

  test('aucun appel nu à `confirm(t(…))`', () => {
    expect(offenders(files, /[^.\w]confirm\(\s*t\(/)).toEqual([])
  })

  test('le helper partagé est le seul à porter le dialogue', () => {
    const helper = readFileSync(join(ROOT, 'utils/native_dialog.ts'), 'utf8')
    expect(helper).toContain('window.confirm(message)')
  })
})
